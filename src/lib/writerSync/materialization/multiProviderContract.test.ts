import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { deriveKeyRing, generateMasterSecret } from '@/lib/cloud/crypto/keys';
import { saveDeviceKeyRing, forgetDeviceKeyRing } from '@/lib/cloud/crypto/keyStore';
import { asDeviceId, asOperationId, asPrincipalId } from '@/lib/syncProviders/ids';
import type { SyncKeyRing } from '@/lib/writerSync/crypto/keyResolver';
import type { EncryptedSyncFrame } from '@/lib/writerSync/operations/operation.types';
import { sweepUnappliedFrames } from './frameIngestion';
import { makeDeleteFrame, makePutFrame } from './writerOperationFactory';
import { applyInboundFrame } from './writerOperationMaterializer';

/**
 * The provider contract: an operation frame is immutable and the receiver is
 * idempotent, so the *same* frame delivered by two different providers
 * materialises exactly once. Dexie Cloud lands frames in `syncOperations` and
 * ingestion sweeps them; a second provider (here a plain in-memory transport —
 * no network code, exactly what a P2P transport reduces to) hands the same
 * bytes straight to the materialiser. Neither route may double-apply, and
 * neither may win by arriving first.
 */

const DEVICE_REMOTE = asDeviceId('remote-device');

let db: LoremDB;
let ring: SyncKeyRing;

const note = (overrides: Partial<Note> = {}): Note => ({
  accessScopeId: 's1',
  createdBy: asPrincipalId('remote-author'),
  updatedBy: asPrincipalId('remote-author'),
  mutationId: asOperationId('op-n1-1'),
  logicalUpdatedAt: { millis: 1000, counter: 0 },
  id: 'n1',
  spaceId: 's1',
  l: 24,
  t: 24,
  w: 184,
  h: 80,
  kind: NoteKind.Note,
  state: NoteState.User,
  body: 'from-remote',
  createdAt: 1000,
  ...overrides,
});

/** Deliver a frame the way a durable provider does: land it in the journal. */
const deliverThroughDurableProvider = async (
  frame: EncryptedSyncFrame,
): Promise<number> => {
  await db.syncOperations.put(frame);
  return sweepUnappliedFrames(db);
};

/** Deliver the identical bytes the way a realtime transport does. */
const deliverThroughSecondProvider = (frame: EncryptedSyncFrame) =>
  applyInboundFrame({
    db,
    // Serialise and reparse: a second provider hands over transported bytes,
    // never the in-memory object this process already holds.
    frame: JSON.parse(JSON.stringify(frame)) as unknown,
    ring,
  });

beforeEach(async () => {
  const master = generateMasterSecret();
  ring = await deriveKeyRing(master, 1);
  await saveDeviceKeyRing({ accountId: null, ring });
  db = new LoremDB('multi-provider-contract');
  await db.open();
});

afterEach(async () => {
  await forgetDeviceKeyRing();
  await db.delete();
});

describe('the same frame through two providers', () => {
  it('materialises once when the durable provider delivers first', async () => {
    const frame = await makePutFrame({
      ring,
      deviceId: DEVICE_REMOTE,
      entityTable: 'notes',
      row: note(),
    });

    expect(await deliverThroughDurableProvider(frame)).toBe(1);
    expect(await deliverThroughSecondProvider(frame)).toBe('applied');

    expect(await db.notes.count()).toBe(1);
    expect((await db.notes.get('n1'))?.body).toBe('from-remote');
    // One accepted operation, one journalled frame — not two of either.
    expect(await db.syncInbox.count()).toBe(1);
    expect(await db.syncOperations.count()).toBe(1);
  });

  it('materialises once when the second provider delivers first', async () => {
    const frame = await makePutFrame({
      ring,
      deviceId: DEVICE_REMOTE,
      entityTable: 'notes',
      row: note(),
    });

    expect(await deliverThroughSecondProvider(frame)).toBe('applied');
    // The durable provider still replicates the row into the journal, but the
    // sweep finds the operation already accepted and applies nothing.
    expect(await deliverThroughDurableProvider(frame)).toBe(0);

    expect(await db.notes.count()).toBe(1);
    expect(await db.syncInbox.count()).toBe(1);
  });

  it('journals the received ciphertext verbatim, so it can be served onward', async () => {
    const frame = await makePutFrame({
      ring,
      deviceId: DEVICE_REMOTE,
      entityTable: 'notes',
      row: note(),
    });

    await deliverThroughSecondProvider(frame);

    const journalled = await db.syncOperations.get(String(frame.operationId));
    expect(journalled).toEqual(frame);
  });

  it('converges a delete identically through either provider', async () => {
    const put = await makePutFrame({
      ring,
      deviceId: DEVICE_REMOTE,
      entityTable: 'notes',
      row: note(),
    });
    await deliverThroughSecondProvider(put);

    const deletion = makeDeleteFrame({
      ring,
      deviceId: DEVICE_REMOTE,
      entityTable: 'notes',
      entityId: 'n1',
      accessScopeId: 's1',
    });
    expect(await deliverThroughDurableProvider(deletion)).toBe(1);
    expect(await deliverThroughSecondProvider(deletion)).toBe('applied');

    expect(await db.notes.get('n1')).toBeUndefined();
    expect(await db.syncTombstones.count()).toBe(1);

    // Replaying the original put returns its recorded result without touching
    // state — the inbox short-circuits before materialisation.
    expect(await deliverThroughSecondProvider(put)).toBe('applied');
    expect(await db.notes.get('n1')).toBeUndefined();

    // A put this device has never seen, still older than the deletion, is
    // rejected on its merits rather than by the inbox: it must not resurrect
    // the note whichever provider carries it.
    const stalePut = await makePutFrame({
      ring,
      deviceId: DEVICE_REMOTE,
      entityTable: 'notes',
      row: note({
        mutationId: asOperationId('op-n1-stale'),
        logicalUpdatedAt: { millis: 500, counter: 0 },
        body: 'resurrected',
      }),
    });
    expect(await deliverThroughSecondProvider(stalePut)).toBe('tombstoned');
    expect(await db.notes.get('n1')).toBeUndefined();
  });
});

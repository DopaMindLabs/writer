import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import {
  NoteKind,
  NoteState,
  type Note,
  type NoteAttachment,
} from '@/db/schema';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import { saveDeviceKeyRing, forgetDeviceKeyRing } from '@/lib/cloud/crypto/keyStore';
import {
  TrustedDeviceStatus,
  asDeviceId,
  asOperationId,
  asPrincipalId,
} from 'writer-sync/core';
import {
  generateDeviceIdentity,
  publicJwkOf,
  type DeviceIdentityKeys,
  type SyncKeyRing,
} from 'writer-sync/crypto';
import {
  TRANSFER_CHUNK_BYTES,
  type EncryptedSyncFrame,
} from 'writer-sync/operations';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';
import { prepareFramePayload } from './attachmentFramePayload';
import { sweepUnappliedFrames } from './frameIngestion';
import {
  makeDeleteFrame,
  makePutFrame,
  signAuthoredFrames,
} from './writerOperationFactory';
import { createWriterFrameVerifier } from './writerFrameVerifier';
import { UntrustedFrameError, applyInboundFrame } from './writerOperationMaterializer';

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
/** The remote device's identity, as a pairing would have left it recorded. */
let remote: DeviceIdentityKeys;

/** Sign a frame as the remote device, the way its author would have. */
const authoredByRemote = async (
  frame: EncryptedSyncFrame,
): Promise<EncryptedSyncFrame> => (await signAuthoredFrames(remote.privateKey, [frame]))[0];

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

const attachmentFrame = async () => {
  const bytes = new Uint8Array(TRANSFER_CHUNK_BYTES + 5);
  const row: NoteAttachment = {
    accessScopeId: 's1',
    createdBy: asPrincipalId('remote-author'),
    updatedBy: asPrincipalId('remote-author'),
    mutationId: asOperationId('op-a1-1'),
    logicalUpdatedAt: { millis: 1000, counter: 0 },
    id: 'a1',
    noteId: 'n1',
    spaceId: 's1',
    name: 'figure.png',
    mime: 'image/png',
    size: bytes.length,
    blob: new Blob([bytes], { type: 'image/png' }),
    createdAt: 1000,
  };
  const prepared = await prepareFramePayload({
    entityTable: 'noteAttachments',
    row: { ...row },
    ring,
  });
  return {
    chunks: prepared.chunks,
    frame: await authoredByRemote(
      await makePutFrame({
        ring,
        deviceId: DEVICE_REMOTE,
        entityTable: 'noteAttachments',
        row: prepared.row,
      }),
    ),
  };
};

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
    verifySignature: createWriterFrameVerifier(db),
  });

beforeEach(async () => {
  const master = generateRootSecret();
  ring = await deriveKeyRing(master, 1);
  await saveDeviceKeyRing({ accountId: null, ring });
  db = new LoremDB('multi-provider-contract');
  await db.open();
  // Both routes verify attribution, so the remote device is one this database
  // has paired with — otherwise nothing it authored would be applied by either.
  remote = await generateDeviceIdentity();
  await createTrustedDeviceStore(db).trust({
    deviceId: DEVICE_REMOTE,
    publicIdentityJwk: await publicJwkOf(remote.publicKey),
    principalId: asPrincipalId('remote-author'),
    addedAt: 1_700_000_000_000,
    lastSessionAt: 1_700_000_000_000,
    displayName: 'Remote',
    status: TrustedDeviceStatus.Active,
    acknowledgedOperations: {},
  });
});

afterEach(async () => {
  await forgetDeviceKeyRing();
  await db.delete();
});

describe('the same frame through two providers', () => {
  it('materialises once when the durable provider delivers first', async () => {
    const frame = await authoredByRemote(
      await makePutFrame({
        ring,
        deviceId: DEVICE_REMOTE,
        entityTable: 'notes',
        row: note(),
      }),
    );

    expect(await deliverThroughDurableProvider(frame)).toBe(1);
    expect(await deliverThroughSecondProvider(frame)).toBe('applied');

    expect(await db.notes.count()).toBe(1);
    expect((await db.notes.get('n1'))?.body).toBe('from-remote');
    // One accepted operation, one journalled frame — not two of either.
    expect(await db.syncInbox.count()).toBe(1);
    expect(await db.syncOperations.count()).toBe(1);
  });

  it('materialises once when the second provider delivers first', async () => {
    const frame = await authoredByRemote(
      await makePutFrame({
        ring,
        deviceId: DEVICE_REMOTE,
        entityTable: 'notes',
        row: note(),
      }),
    );

    expect(await deliverThroughSecondProvider(frame)).toBe('applied');
    // The durable provider still replicates the row into the journal, but the
    // sweep finds the operation already accepted and applies nothing.
    expect(await deliverThroughDurableProvider(frame)).toBe(0);

    expect(await db.notes.count()).toBe(1);
    expect(await db.syncInbox.count()).toBe(1);
  });

  it('journals the received ciphertext verbatim, so it can be served onward', async () => {
    const frame = await authoredByRemote(
      await makePutFrame({
        ring,
        deviceId: DEVICE_REMOTE,
        entityTable: 'notes',
        row: note(),
      }),
    );

    await deliverThroughSecondProvider(frame);

    const journalled = await db.syncOperations.get(String(frame.operationId));
    expect(journalled).toEqual(frame);
  });

  it('materialises a chunked attachment once across two providers', async () => {
    const { frame, chunks } = await attachmentFrame();
    await db.syncAttachmentChunks.bulkPut(chunks);

    expect(await deliverThroughSecondProvider(frame)).toBe('applied');
    expect(await deliverThroughDurableProvider(frame)).toBe(0);

    expect(await db.noteAttachments.count()).toBe(1);
    expect(await db.syncInbox.count()).toBe(1);
    expect(await db.syncOperations.count()).toBe(1);
  });

  it('converges a delete identically through either provider', async () => {
    const put = await authoredByRemote(
      await makePutFrame({
        ring,
        deviceId: DEVICE_REMOTE,
        entityTable: 'notes',
        row: note(),
      }),
    );
    await deliverThroughSecondProvider(put);

    const deletion = await authoredByRemote(
      makeDeleteFrame({
        ring,
        deviceId: DEVICE_REMOTE,
        entityTable: 'notes',
        entityId: 'n1',
        accessScopeId: 's1',
      }),
    );
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
    const stalePut = await authoredByRemote(
      await makePutFrame({
        ring,
        deviceId: DEVICE_REMOTE,
        entityTable: 'notes',
        row: note({
          mutationId: asOperationId('op-n1-stale'),
          logicalUpdatedAt: { millis: 500, counter: 0 },
          body: 'resurrected',
        }),
      }),
    );
    expect(await deliverThroughSecondProvider(stalePut)).toBe('tombstoned');
    expect(await db.notes.get('n1')).toBeUndefined();
  });

  it('applies nothing a durable provider forged into the journal', async () => {
    const impostor = await generateDeviceIdentity();
    // A deletion needs no payload, so forging one costs an attacker nothing but
    // the signature it cannot produce.
    const forged = (
      await signAuthoredFrames(
        impostor.privateKey,
        [
          makeDeleteFrame({
            ring,
            deviceId: DEVICE_REMOTE,
            entityTable: 'notes',
            entityId: 'n1',
            accessScopeId: 's1',
          }),
        ],
      )
    )[0];
    await deliverThroughSecondProvider(
      await authoredByRemote(
        await makePutFrame({
          ring,
          deviceId: DEVICE_REMOTE,
          entityTable: 'notes',
          row: note(),
        }),
      ),
    );

    expect(await deliverThroughDurableProvider(forged)).toBe(0);
    await expect(deliverThroughSecondProvider(forged)).rejects.toBeInstanceOf(
      UntrustedFrameError,
    );

    // The note the trusted device wrote is untouched, and the forgery was
    // never accepted into the inbox.
    expect((await db.notes.get('n1'))?.body).toBe('from-remote');
    expect(await db.syncTombstones.count()).toBe(0);
    expect(await db.syncInbox.count()).toBe(1);
  });
});

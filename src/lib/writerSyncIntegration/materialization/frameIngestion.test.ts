import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import { saveDeviceKeyRing, forgetDeviceKeyRing } from '@/lib/cloud/crypto/keyStore';
import {
  NoteKind,
  NoteState,
  type Note,
  type NoteAttachment,
} from '@/db/schema';
import { asDeviceId, asOperationId, asPrincipalId } from 'writer-sync/core';
import type { SyncKeyRing } from 'writer-sync/crypto';
import { TRANSFER_CHUNK_BYTES } from 'writer-sync/operations';
import { prepareFramePayload } from './attachmentFramePayload';
import { makePutFrame } from './writerOperationFactory';
import { applyInboundFrame } from './writerOperationMaterializer';
import { sweepUnappliedFrames } from './frameIngestion';

const DEVICE_REMOTE = asDeviceId('remote-device');

let db: LoremDB;

const note = (): Note => ({
  accessScopeId: 's1',
  createdBy: asPrincipalId('me'),
  updatedBy: asPrincipalId('me'),
  mutationId: asOperationId('op-n1'),
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
});

const attachmentFrame = async (ring: SyncKeyRing) => {
  const bytes = new Uint8Array(TRANSFER_CHUNK_BYTES + 3);
  const row: NoteAttachment = {
    accessScopeId: 's1',
    createdBy: asPrincipalId('me'),
    updatedBy: asPrincipalId('me'),
    mutationId: asOperationId('op-a1'),
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
    frame: await makePutFrame({
      ring,
      deviceId: DEVICE_REMOTE,
      entityTable: 'noteAttachments',
      row: prepared.row,
    }),
  };
};

beforeEach(async () => {
  db = new LoremDB('frame-ingestion-test');
  await db.open();
});

afterEach(async () => {
  await forgetDeviceKeyRing();
  await db.delete();
  vi.restoreAllMocks();
});

describe('sweepUnappliedFrames', () => {
  it('applies nothing while the device is keyless — frames wait in the journal', async () => {
    const remoteRing = await deriveKeyRing(generateRootSecret(), 1);
    const frame = await makePutFrame({
      ring: remoteRing,
      deviceId: DEVICE_REMOTE,
      entityTable: 'notes',
      row: note(),
    });
    await db.syncOperations.put(frame);

    expect(await sweepUnappliedFrames(db)).toBe(0);
    expect(await db.notes.get('n1')).toBeUndefined();
  });

  it('materialises a provider-replicated frame through the shared inbox path', async () => {
    const master = generateRootSecret();
    const ring = await deriveKeyRing(master, 1);
    await saveDeviceKeyRing({ accountId: null, ring });
    const frame = await makePutFrame({
      ring,
      deviceId: DEVICE_REMOTE,
      entityTable: 'notes',
      row: note(),
    });
    // A durable provider (Dexie Cloud) lands the frame straight in the journal.
    await db.syncOperations.put(frame);

    expect(await sweepUnappliedFrames(db)).toBe(1);
    expect((await db.notes.get('n1'))?.body).toBe('from-remote');
    // A second sweep re-applies nothing.
    expect(await sweepUnappliedFrames(db)).toBe(0);
    expect(await db.syncInbox.count()).toBe(1);
  });

  it('applies once when the same frame arrives through Dexie and a second provider', async () => {
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    await saveDeviceKeyRing({ accountId: null, ring });
    const frame = await makePutFrame({
      ring,
      deviceId: DEVICE_REMOTE,
      entityTable: 'notes',
      row: note(),
    });

    // Path one: a fake second provider hands the frame over directly.
    await applyInboundFrame({ db, frame: JSON.parse(JSON.stringify(frame)), ring });
    // Path two: Dexie replicated the identical frame into the journal.
    await db.syncOperations.put(frame);

    expect(await sweepUnappliedFrames(db)).toBe(0);
    expect(await db.syncInbox.count()).toBe(1);
    expect((await db.notes.get('n1'))?.body).toBe('from-remote');
  });

  it('quietly retries an incomplete attachment after its chunks arrive', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    await saveDeviceKeyRing({ accountId: null, ring });
    const { frame, chunks } = await attachmentFrame(ring);
    await db.syncOperations.put(frame);

    expect(await sweepUnappliedFrames(db)).toBe(0);
    expect(await db.syncInbox.count()).toBe(0);
    expect(consoleError).not.toHaveBeenCalled();

    await db.syncAttachmentChunks.bulkPut(chunks);
    expect(await sweepUnappliedFrames(db)).toBe(1);
    expect(await db.noteAttachments.get('a1')).toBeDefined();
    expect(await db.syncInbox.count()).toBe(1);
  });

  it('contains an invalid frame instead of blocking the rest of the journal', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    await saveDeviceKeyRing({ accountId: null, ring });
    const good = await makePutFrame({
      ring,
      deviceId: DEVICE_REMOTE,
      entityTable: 'notes',
      row: note(),
    });
    await db.syncOperations.put({ ...good, operationId: asOperationId('op-bad'), payload: btoa('junk') });
    await db.syncOperations.put(good);

    expect(await sweepUnappliedFrames(db)).toBe(1);
    expect((await db.notes.get('n1'))?.body).toBe('from-remote');
    expect(consoleError).toHaveBeenCalled();
  });
});

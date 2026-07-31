import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import {
  NoteKind,
  NoteState,
  type Note,
  type NoteAttachment,
} from '@/db/schema';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import { keyIdOf } from '@/lib/cloud/crypto/envelope';
import { createEncryptionMiddleware } from '@/lib/cloud/crypto/middleware';
import { hasPlaintextSyncedRows, sealExistingRows } from '@/lib/cloud/setup';
import { asDeviceId, asOperationId, asPrincipalId } from 'writer-sync/core';
import type {
  ScopeKeyResolver,
  SyncKeyRing,
} from 'writer-sync/crypto';
import {
  fromBase64,
  generateDeviceIdentity,
  openOperationPayload,
  verifyFrameSignature,
  type DeviceIdentityKeys,
} from 'writer-sync/crypto';
import {
  TRANSFER_CHUNK_BYTES,
  verifyFrame,
  type AttachmentChunkManifest,
} from 'writer-sync/operations';
import { createOperationJournalMiddleware } from './operationJournalMiddleware';
import { makePutFrame } from './writerOperationFactory';
import { applyInboundFrame } from './writerOperationMaterializer';

/**
 * The outbound half of slice 1F: every synced-content write journals an
 * encrypted operation frame through the DBCore chokepoint — and the writes
 * that must NOT journal (materialisation, keyless, local resets) stay silent.
 */

const DEVICE_LOCAL = asDeviceId('device-local');
const DEVICE_REMOTE = asDeviceId('device-remote');

let db: LoremDB;
let ring: SyncKeyRing;
let identityKeys: DeviceIdentityKeys;
const holder: { ring: SyncKeyRing | null } = { ring: null };

const resolver: ScopeKeyResolver = {
  keyFor: () => holder.ring,
  hasAnyKey: () => holder.ring !== null,
};

const note = (overrides: Partial<Note> = {}): Note => ({
  accessScopeId: 's1',
  createdBy: asPrincipalId('me'),
  updatedBy: asPrincipalId('me'),
  mutationId: asOperationId(`op-${overrides.id ?? 'n1'}-1`),
  logicalUpdatedAt: { millis: 1000, counter: 0 },
  id: 'n1',
  spaceId: 's1',
  l: 24,
  t: 24,
  w: 184,
  h: 80,
  kind: NoteKind.Note,
  state: NoteState.User,
  body: 'hello',
  createdAt: 1000,
  ...overrides,
});

const attachmentBytes = (length = TRANSFER_CHUNK_BYTES + 19): Uint8Array =>
  Uint8Array.from({ length }, (_unused, index) => index % 251);

const attachment = (
  overrides: Partial<NoteAttachment> = {},
): NoteAttachment => {
  const bytes = attachmentBytes();
  const content = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return {
    accessScopeId: 's1',
    createdBy: asPrincipalId('me'),
    updatedBy: asPrincipalId('me'),
    mutationId: asOperationId(`op-${overrides.id ?? 'a1'}-1`),
    logicalUpdatedAt: { millis: 1000, counter: 0 },
    id: 'a1',
    noteId: 'n1',
    spaceId: 's1',
    name: 'figure.png',
    mime: 'image/png',
    size: bytes.length,
    blob: new Blob([content], { type: 'image/png' }),
    createdAt: 1000,
    ...overrides,
  };
};

beforeEach(async () => {
  ring = await deriveKeyRing(generateRootSecret(), 1);
  holder.ring = ring;
  identityKeys = await generateDeviceIdentity();
  db = new LoremDB('op-journal');
  db.use(createEncryptionMiddleware(resolver, () => 'none'));
  db.use(
    createOperationJournalMiddleware({
      resolver,
      identity: () =>
        Promise.resolve({
          deviceId: DEVICE_LOCAL,
          privateKey: identityKeys.privateKey,
        }),
    }),
  );
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe('operation journal middleware', () => {
  it('journals a verifiable put frame for a keyed write', async () => {
    const row = note();
    await db.notes.put(row);

    const frames = await db.syncOperations.toArray();
    expect(frames).toHaveLength(1);
    const frame = await verifyFrame(frames[0]);
    expect(frame.operationId).toBe(row.mutationId);
    expect(frame.accessScopeId).toBe('s1');
    expect(frame.entityTable).toBe('notes');
    expect(frame.entityId).toBe('n1');
    expect(frame.kind).toBe('put');
    expect(frame.deviceId).toBe(DEVICE_LOCAL);
    expect(frame.keyId).toBe(keyIdOf(ring));
    expect(frame.epoch).toBe(1);
    const payload = await openOperationPayload(ring, frame, frame.payload);
    expect(payload).toMatchObject({ id: 'n1', body: 'hello' });
  });

  it('journals a fresh frame when an update mints a new mutation id', async () => {
    await db.notes.put(note());
    await db.notes.update('n1', {
      body: 'edited',
      mutationId: asOperationId('op-n1-2'),
      logicalUpdatedAt: { millis: 2000, counter: 0 },
    });

    const ids = (await db.syncOperations.toArray()).map((f) => f.operationId);
    expect(ids.sort()).toEqual(['op-n1-1', 'op-n1-2']);
  });

  it('journals a delete frame carrying the stored row scope', async () => {
    await db.notes.put(note());
    await db.notes.delete('n1');

    const frames = await db.syncOperations.toArray();
    expect(frames).toHaveLength(2);
    const deletion = frames.find((frame) => frame.kind === 'delete');
    expect(deletion).toMatchObject({
      entityTable: 'notes',
      entityId: 'n1',
      accessScopeId: 's1',
      payload: '',
    });
  });

  it('signs the put frames it journals with this device’s identity key', async () => {
    await db.notes.put(note());

    const [frame] = await db.syncOperations.toArray();
    expect(frame.signature).not.toBe('');
    await expect(verifyFrameSignature(identityKeys.publicKey, frame)).resolves.toBe(true);
  });

  it('signs the delete frames it journals', async () => {
    await db.notes.put(note());
    await db.notes.delete('n1');

    const frames = await db.syncOperations.toArray();
    const deletion = frames.find((frame) => frame.kind === 'delete');
    expect(deletion).toBeDefined();
    if (!deletion) return;
    await expect(verifyFrameSignature(identityKeys.publicKey, deletion)).resolves.toBe(
      true,
    );
  });

  it('signs over the sealed payload, so an altered frame no longer verifies', async () => {
    await db.notes.put(note());

    const [frame] = await db.syncOperations.toArray();
    await expect(
      verifyFrameSignature(identityKeys.publicKey, { ...frame, entityId: 'n2' }),
    ).resolves.toBe(false);
  });

  it('journals nothing while the device is keyless', async () => {
    holder.ring = null;
    await db.notes.put(note());
    await db.notes.delete('n1');

    expect(await db.syncOperations.count()).toBe(0);
  });

  it('backfills frames when the unlock re-seal re-puts keyless rows', async () => {
    holder.ring = null;
    await db.notes.put(note());
    await db.notes.put(note({ id: 'n2', mutationId: asOperationId('op-n2-1') }));
    expect(await db.syncOperations.count()).toBe(0);

    holder.ring = ring;
    await sealExistingRows(db);

    const ids = (await db.syncOperations.toArray()).map((f) => f.operationId);
    expect(ids.sort()).toEqual(['op-n1-1', 'op-n2-1']);
    expect(await hasPlaintextSyncedRows(db)).toBe(false);
  });

  it('does not re-journal a frame the materialiser applies', async () => {
    const row = note({ id: 'n-remote', mutationId: asOperationId('op-remote-1') });
    const frame = await makePutFrame({
      ring,
      deviceId: DEVICE_REMOTE,
      entityTable: 'notes',
      row,
    });

    await applyInboundFrame({ db, frame, ring });

    const frames = await db.syncOperations.toArray();
    expect(frames).toHaveLength(1);
    expect(frames[0].operationId).toBe('op-remote-1');
    expect(frames[0].deviceId).toBe(DEVICE_REMOTE);
    expect((await db.notes.get('n-remote'))?.body).toBe('hello');
  });

  it('leaves non-journalled tables alone', async () => {
    await db.settings.put({
      key: 'global',
      proseFont: 'Source Serif 4',
      uiFont: 'Geist',
      proseSize: 18,
      lineHeight: 1.6,
      measure: 68,
      theme: 'dark',
    });
    expect(await db.syncOperations.count()).toBe(0);
  });

  it('journals inside an explicit multi-table transaction', async () => {
    await db.transaction('rw', db.notes, db.meta, async () => {
      await db.notes.put(note());
      await db.meta.put({ key: 'k', value: 'v' });
    });

    const frames = await db.syncOperations.toArray();
    expect(frames).toHaveLength(1);
    expect(frames[0].entityTable).toBe('notes');
  });

  it('does not journal a rejected add', async () => {
    await db.notes.add(note());
    await expect(db.notes.add(note({ body: 'dupe' }))).rejects.toThrow();

    expect(await db.syncOperations.count()).toBe(1);
  });

  it('treats a table clear as a local reset, not synced deletions', async () => {
    await db.notes.put(note());
    await db.syncOperations.clear();
    await db.notes.clear();

    expect(await db.syncOperations.count()).toBe(0);
  });

  it('journals an attachment as a thin frame and bounded ciphertext chunks', async () => {
    await db.noteAttachments.put(attachment());

    const [frame] = await db.syncOperations.toArray();
    const payload = await openOperationPayload(ring, frame, frame.payload);
    const manifest = payload.blobRef as AttachmentChunkManifest;
    expect(payload).not.toHaveProperty('blob');
    expect(manifest).toMatchObject({
      attachmentId: 'a1',
      chunkBytes: TRANSFER_CHUNK_BYTES,
      chunkCount: 2,
    });

    const chunks = await db.syncAttachmentChunks
      .where('attachmentId')
      .equals('a1')
      .sortBy('index');
    expect(chunks).toHaveLength(2);
    expect(chunks.map((chunk) => chunk.accessScopeId)).toEqual(['s1', 's1']);
    expect(chunks.map((chunk) => fromBase64(chunk.bytes).length)).toEqual([
      TRANSFER_CHUNK_BYTES,
      manifest.totalBytes - TRANSFER_CHUNK_BYTES,
    ]);
  });

  it('rolls back the attachment, its thin frame and its chunks together', async () => {
    await expect(
      db.transaction('rw', db.noteAttachments, async () => {
        await db.noteAttachments.put(attachment());
        expect(await db.syncAttachmentChunks.count()).toBe(2);
        expect(await db.syncOperations.count()).toBe(1);
        throw new Error('abort attachment write');
      }),
    ).rejects.toThrow('abort attachment write');

    expect(await db.noteAttachments.count()).toBe(0);
    expect(await db.syncOperations.count()).toBe(0);
    expect(await db.syncAttachmentChunks.count()).toBe(0);
  });

  it('removes an attachment’s chunks in the same transaction as its delete', async () => {
    await db.noteAttachments.put(attachment());
    expect(
      await db.syncAttachmentChunks.where('attachmentId').equals('a1').count(),
    ).toBe(2);

    await db.noteAttachments.delete('a1');

    expect(await db.noteAttachments.get('a1')).toBeUndefined();
    expect(
      await db.syncAttachmentChunks.where('attachmentId').equals('a1').count(),
    ).toBe(0);
    expect(
      (await db.syncOperations.toArray()).filter((frame) => frame.kind === 'delete'),
    ).toHaveLength(1);
  });

  it('removes attachment chunks on a keyless local delete without journalling it', async () => {
    await db.noteAttachments.put(attachment());
    const framesBeforeDelete = await db.syncOperations.count();
    holder.ring = null;

    await db.noteAttachments.delete('a1');

    expect(await db.syncAttachmentChunks.count()).toBe(0);
    expect(await db.syncOperations.count()).toBe(framesBeforeDelete);
  });
});

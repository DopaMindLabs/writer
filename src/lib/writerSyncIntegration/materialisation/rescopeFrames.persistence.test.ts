import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { NoteKind, NoteState, type Note, type NoteAttachment } from '@/db/schema';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import { createEncryptionMiddleware } from '@/lib/cloud/crypto/middleware';
import { sampleMetadata } from '@/test/fixtures';
import { asDeviceId, asOperationId, TrustedDeviceStatus } from 'writer-sync/core';
import {
  generateDeviceIdentity, publicJwkOf, verifyFrameSignature,
  type DeviceIdentityKeys, type ScopeKeyResolver, type SyncKeyRing,
} from 'writer-sync/crypto';
import { TRANSFER_CHUNK_BYTES, verifyFrame } from 'writer-sync/operations';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';
import { writerClock } from '@/lib/writerSyncIntegration/writerLogicalClock';
import { createOperationJournalMiddleware } from './operationJournalMiddleware';
import { rescopeFrames } from './rescopeFrames';
import { applyInboundFrame } from './writerOperationMaterialiser';

const DEVICE = asDeviceId('moving-device');
let keys: DeviceIdentityKeys;
let rings: Map<string, SyncKeyRing>;
let db: LoremDB;
let peer: LoremDB;
const identity = () => Promise.resolve({ deviceId: DEVICE, privateKey: keys.privateKey });
const resolver: ScopeKeyResolver = {
  keyFor: ({ accessScopeId }) => rings.get(accessScopeId) ?? null,
  hasAnyKey: () => rings.size > 0,
};
const move = () => ({ requestId: 'move-a-b', db, resolver, identity,
  scopes: { from: 'a', to: 'b' } });
const note = (id = 'n1'): Note => ({
  ...sampleMetadata(), accessScopeId: 'a', id, spaceId: 'space',
  mutationId: asOperationId(`note-${id}-initial`),
  l: 0, t: 0, w: 100, h: 100, kind: NoteKind.Note, state: NoteState.User,
  body: 'current content', createdAt: 1000,
});
const attachment = (): NoteAttachment => {
  const blob = new Blob([new Uint8Array(TRANSFER_CHUNK_BYTES + 19).fill(42)],
    { type: 'application/octet-stream' });
  return { ...sampleMetadata(), accessScopeId: 'a', id: 'attachment',
    mutationId: asOperationId('attachment-initial'),
    noteId: 'n1', spaceId: 'space', name: 'data.bin', mime: blob.type,
    size: blob.size, blob, createdAt: 1000 };
};

beforeEach(async () => {
  keys = await generateDeviceIdentity();
  rings = new Map();
  for (const scope of ['a', 'b']) rings.set(scope, await deriveKeyRing(generateRootSecret(), 1));
  db = new LoremDB('scope-move-middleware', { cloud: true });
  db.use(createEncryptionMiddleware(resolver, () => 'none'));
  db.use(createOperationJournalMiddleware({ resolver, identity }));
  peer = new LoremDB('scope-move-attachment-peer');
  await db.open();
  await createTrustedDeviceStore(db).trust({
    deviceId: DEVICE, publicIdentityJwk: await publicJwkOf(keys.publicKey),
    principalId: sampleMetadata().createdBy, status: TrustedDeviceStatus.Active,
    addedAt: 1000, lastSessionAt: 1000, displayName: 'Moving device', acknowledgedOperations: {},
  });
});

afterEach(async () => {
  await db.delete();
  await peer.delete();
});

describe('scope moves through persistence middleware', () => {
  it('commits one frame per current row without duplicate middleware journalling', async () => {
    const row = note();
    await db.notes.put(row);
    const original = await db.syncOperations.get(String(row.mutationId));
    expect(await rescopeFrames(move())).toBe(1);
    const frame = await verifyFrame(await db.syncOperations.where({ accessScopeId: 'b' }).first());
    expect(await db.notes.get(row.id)).toEqual({ ...row, accessScopeId: 'b',
      mutationId: frame.operationId, logicalUpdatedAt: frame.logicalAt });
    expect(await db.syncOperations.count()).toBe(2);
    expect(await db.syncOperations.get(String(row.mutationId))).toEqual(original);
    expect(await db.syncInbox.count()).toBe(1);
    expect(await db.syncScopeRebindings.get('move-a-b')).toMatchObject({
      sourceScopeId: 'a', destinationScopeId: 'b', operationIds: [frame.operationId],
    });
    expect(await verifyFrameSignature(keys.publicKey, frame)).toBe(true);
  });

  it('reseals current attachment bytes so a destination peer can reconstruct them', async () => {
    const row = attachment();
    await db.noteAttachments.put(row);
    const original = await db.syncOperations.get(String(row.mutationId));
    const oldChunks = await db.syncAttachmentChunks.toArray();
    expect(await rescopeFrames(move())).toBe(1);
    const frame = await verifyFrame(await db.syncOperations.where({ accessScopeId: 'b' }).first());
    const chunks = await db.syncAttachmentChunks.toArray();
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.accessScopeId === 'b')).toBe(true);
    expect(chunks).not.toEqual(oldChunks);
    await peer.syncAttachmentChunks.bulkPut(chunks);
    expect(await applyInboundFrame({ db: peer, frame, ring: rings.get('b')!,
      verifySignature: (candidate) => verifyFrameSignature(keys.publicKey, candidate) })).toBe('applied');
    const received = await peer.noteAttachments.get(row.id);
    expect(received).toMatchObject({ accessScopeId: 'b', mutationId: frame.operationId });
    expect(await received?.blob.arrayBuffer()).toEqual(await row.blob.arrayBuffer());
    expect(await (await db.noteAttachments.get(row.id))?.blob.arrayBuffer())
      .toEqual(await row.blob.arrayBuffer());
    expect(await db.syncOperations.get(String(row.mutationId))).toEqual(original);
    expect(await db.syncOperations.count()).toBe(2);
  });

  it('rolls back rows, tombstones, chunks, inbox and frames if the receipt cannot commit', async () => {
    await db.notes.put(note());
    await db.notes.put(note('deleted'));
    await db.notes.delete('deleted');
    await db.noteAttachments.put(attachment());
    const before = { rows: await db.notes.toArray(), attachments: await db.noteAttachments.toArray(),
      frames: await db.syncOperations.toArray(), tombs: await db.syncTombstones.toArray(),
      chunks: await db.syncAttachmentChunks.toArray(), inbox: await db.syncInbox.toArray() };
    vi.spyOn(db.syncScopeRebindings, 'bulkAdd').mockRejectedValue(new Error('receipt unavailable'));
    await expect(rescopeFrames(move())).rejects.toThrow('receipt unavailable');
    expect({ rows: await db.notes.toArray(), attachments: await db.noteAttachments.toArray(),
      frames: await db.syncOperations.toArray(), tombs: await db.syncTombstones.toArray(),
      chunks: await db.syncAttachmentChunks.toArray(), inbox: await db.syncInbox.toArray() }).toEqual(before);
    expect(await db.syncScopeRebindings.count()).toBe(0);
  });

  it('replaces leftover chunks from an older, larger attachment when moving its current bytes', async () => {
    const original = attachment();
    await db.noteAttachments.put(original);
    const blob = new Blob(['current smaller attachment'], { type: original.mime });
    await db.noteAttachments.put({ ...original, blob, size: blob.size,
      mutationId: asOperationId('attachment-shrunk'), logicalUpdatedAt: writerClock.now() });
    expect(await db.syncAttachmentChunks.count()).toBe(2);
    expect(await rescopeFrames(move())).toBe(1);
    const chunks = await db.syncAttachmentChunks.toArray();
    expect(chunks).toHaveLength(1);
    expect(chunks[0].accessScopeId).toBe('b');
    const frame = await db.syncOperations.where({ accessScopeId: 'b' }).first();
    // Materialisation checks every retained chunk's scope before applying the manifest.
    expect(await applyInboundFrame({ db, frame, ring: rings.get('b')!,
      verifySignature: (candidate) => verifyFrameSignature(keys.publicKey, candidate) })).toBe('applied');
    expect(await (await db.noteAttachments.get(original.id))?.blob.text()).toBe(await blob.text());
  });

  it('refuses a keyless compacted scope without recording it as an empty completed move', async () => {
    await db.notes.put(note());
    await db.syncOperations.clear();
    const source = rings.get('a')!;
    rings.delete('a');
    await expect(rescopeFrames(move())).rejects.toThrow(/scope keys must be available/);
    expect(await db.syncScopeRebindings.count()).toBe(0);
    rings.set('a', source);
    expect((await db.notes.get('n1'))?.accessScopeId).toBe('a');
    expect(await rescopeFrames(move())).toBe(1);
  });

  it('aborts when author trust changes after admission', async () => {
    await db.notes.put(note());
    await expect(rescopeFrames({ ...move(), identity: async () => {
      await createTrustedDeviceStore(db).revoke({ deviceId: DEVICE, at: Date.now() });
      return identity();
    } })).rejects.toThrow(/changed during/);
    expect((await db.notes.get('n1'))?.accessScopeId).toBe('a');
    expect(await db.syncOperations.count()).toBe(1);
    expect(await db.syncScopeRebindings.count()).toBe(0);
  });

  it('does not let a completed empty request sweep up content added later', async () => {
    expect(await rescopeFrames(move())).toBe(0);
    await db.notes.put(note());
    expect(await rescopeFrames(move())).toBe(0);
    expect((await db.notes.get('n1'))?.accessScopeId).toBe('a');
    expect(await rescopeFrames({ ...move(), requestId: 'later-move' })).toBe(1);
  });
});

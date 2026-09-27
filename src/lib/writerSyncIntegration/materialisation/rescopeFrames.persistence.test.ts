import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { NoteKind, NoteState, type Note, type NoteAttachment } from '@/db/schema';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import { createEncryptionMiddleware } from '@/lib/cloud/crypto/middleware';
import { sampleMetadata } from '@/test/fixtures';
import { asDeviceId, asOperationId, TrustedDeviceStatus } from 'writer-sync/core';
import {
  generateDeviceIdentity, publicJwkOf, verifyFrameSignature,
  type DeviceIdentityKeys, type ScopeKeyContext, type ScopeKeyResolver, type SyncKeyRing,
} from 'writer-sync/crypto';
import {
  compareOperations, MAX_ATTACHMENT_BYTES, TRANSFER_CHUNK_BYTES, verifyFrame,
  type EncryptedSyncFrame,
} from 'writer-sync/operations';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';
import { writerClock } from '@/lib/writerSyncIntegration/writerLogicalClock';
import * as payloads from './attachmentFramePayload';
import { createOperationJournalMiddleware } from './operationJournalMiddleware';
import { ScopeRebindingTooLargeError } from './prepareScopeRebinding';
import { rescopeFrames } from './rescopeFrames';
import { applyInboundFrame } from './writerOperationMaterialiser';

const DEVICE = asDeviceId('moving-device');
let keys: DeviceIdentityKeys;
let rings: Map<string, SyncKeyRing>;
let db: LoremDB;
let peer: LoremDB;
const identity = () => Promise.resolve({ deviceId: DEVICE, privateKey: keys.privateKey });
/** A resolver may withhold a key for one table's context while others resolve. */
let withheld: (context: ScopeKeyContext) => boolean = () => false;
/** Whether the encryption middleware found a row its resolved key does not open. */
let mismatched = false;
const resolver: ScopeKeyResolver = {
  keyFor: (context) => (withheld(context) ? null : rings.get(context.accessScopeId) ?? null),
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
  withheld = () => false;
  mismatched = false;
  keys = await generateDeviceIdentity();
  rings = new Map();
  for (const scope of ['a', 'b']) rings.set(scope, await deriveKeyRing(generateRootSecret(), 1));
  db = new LoremDB('scope-move-middleware', { cloud: true });
  db.use(createEncryptionMiddleware(resolver, () => 'none', () => {
    mismatched = true;
  }));
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
  it('commits a withdrawal and a put per current row without duplicate middleware journalling', async () => {
    const row = note();
    await db.notes.put(row);
    const original = await db.syncOperations.get(String(row.mutationId));
    expect(await rescopeFrames(move())).toBe(1);
    const frame = await verifyFrame(await db.syncOperations.where({ accessScopeId: 'b' }).first());
    const withdrawal = await verifyFrame((await db.syncOperations.where({ accessScopeId: 'a' })
      .toArray()).find(({ kind }) => kind === 'delete'));
    expect(await db.notes.get(row.id)).toEqual({ ...row, accessScopeId: 'b',
      mutationId: frame.operationId, logicalUpdatedAt: frame.logicalAt });
    expect(await db.syncOperations.count()).toBe(3);
    expect(await db.syncOperations.get(String(row.mutationId))).toEqual(original);
    expect(compareOperations(withdrawal, frame)).toBeLessThan(0);
    expect(await db.syncInbox.toArray()).toEqual(expect.arrayContaining([
      expect.objectContaining({ operationId: frame.operationId, result: 'applied' }),
      expect.objectContaining({ operationId: withdrawal.operationId, result: 'superseded' }),
      expect.objectContaining({ operationId: row.mutationId, result: 'superseded' }),
    ]));
    expect(await db.syncInbox.count()).toBe(3);
    expect(await db.syncScopeRebindings.get('move-a-b')).toMatchObject({
      sourceScopeId: 'a', destinationScopeId: 'b',
      operationIds: [withdrawal.operationId, frame.operationId],
    });
    expect(await verifyFrameSignature(keys.publicKey, frame)).toBe(true);
    expect(await verifyFrameSignature(keys.publicKey, withdrawal)).toBe(true);
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
    // The original, the withdrawal from the source, and the moved put.
    expect(await db.syncOperations.count()).toBe(3);
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

  it('prepares one attachment at a time', async () => {
    await db.noteAttachments.put(attachment());
    await db.noteAttachments.put({ ...attachment(), id: 'attachment-2',
      mutationId: asOperationId('attachment-2-initial') });
    const prepare = payloads.prepareFramePayload;
    let preparing = 0;
    let most = 0;
    vi.spyOn(payloads, 'prepareFramePayload').mockImplementation(async (options) => {
      preparing += 1;
      most = Math.max(most, preparing);
      try {
        return await prepare(options);
      } finally {
        preparing -= 1;
      }
    });

    expect(await rescopeFrames(move())).toBe(2);
    expect(most).toBe(1);
  });

  it('refuses a move carrying more attachment content than it holds at once, before reading any', async () => {
    await db.noteAttachments.put(attachment());
    await db.noteAttachments.put({ ...attachment(), id: 'attachment-2',
      mutationId: asOperationId('attachment-2-initial') });
    // Each within a transfer's limit, together over it.
    vi.spyOn(Blob.prototype, 'size', 'get').mockReturnValue(MAX_ATTACHMENT_BYTES / 2 + 1);
    const reads = vi.spyOn(Blob.prototype, 'arrayBuffer');
    const frames = await db.syncOperations.count();

    await expect(rescopeFrames(move())).rejects.toThrow(ScopeRebindingTooLargeError);
    expect(reads).not.toHaveBeenCalled();
    expect(await db.syncScopeRebindings.count()).toBe(0);
    expect(await db.syncOperations.count()).toBe(frames);
    expect((await db.noteAttachments.toArray()).map((row) => row.accessScopeId)).toEqual(['a', 'a']);
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

  it('refuses a source table it cannot read instead of completing an empty move', async () => {
    await db.notes.put(note());
    // Compacted: nothing but the sealed row itself says the note is in the scope.
    await db.syncOperations.clear();
    withheld = ({ table, accessScopeId, operation }) =>
      table === 'notes' && accessScopeId === 'a' && operation === 'read';
    await expect(rescopeFrames(move())).rejects.toThrow(/scope keys must be available/);
    expect(await db.syncScopeRebindings.count()).toBe(0);

    withheld = () => false;
    expect(await rescopeFrames(move())).toBe(1);
    expect((await db.notes.get('n1'))?.accessScopeId).toBe('b');
  });

  it('refuses a source row hidden for want of its own key instead of leaving it behind', async () => {
    await db.notes.put(note());
    await db.notes.put(note('n2'));
    // Compacted: nothing but the sealed rows say the notes are in the scope.
    await db.syncOperations.clear();
    withheld = ({ table, primaryKey, accessScopeId, operation }) =>
      table === 'notes' && primaryKey === 'n2' && accessScopeId === 'a' && operation === 'read';
    await expect(rescopeFrames(move())).rejects.toThrow(/cannot be read in full/);
    expect(await db.syncScopeRebindings.count()).toBe(0);
    expect((await db.notes.get('n1'))?.accessScopeId).toBe('a');

    withheld = () => false;
    expect(await rescopeFrames(move())).toBe(2);
    expect((await db.notes.get('n2'))?.accessScopeId).toBe('b');
  });

  it('refuses a source row its source key does not open instead of leaving it behind', async () => {
    await db.notes.put(note());
    // Sealed under a key this device no longer holds for the scope: a source key
    // still resolves for the row, but it does not open it.
    const current = rings.get('a')!;
    rings.set('a', await deriveKeyRing(generateRootSecret(), 1));
    await db.notes.put(note('n2'));
    rings.set('a', current);
    // Compacted: nothing but the sealed rows say the notes are in the scope.
    await db.syncOperations.clear();

    await expect(rescopeFrames(move())).rejects.toThrow(/cannot be read in full/);
    expect(mismatched).toBe(true);
    expect(await db.syncScopeRebindings.count()).toBe(0);
    expect(await db.syncOperations.count()).toBe(0);
    expect((await db.notes.get('n1'))?.accessScopeId).toBe('a');
  });

  it('settles the source history so compacting the move frame cannot undo the move', async () => {
    const row = note();
    await db.notes.put(row);
    const source = (await db.syncOperations.get(String(row.mutationId)))!;
    expect(await rescopeFrames(move())).toBe(1);
    // Every peer acknowledged the destination frame; the source scope's history remains.
    await db.syncOperations.where({ accessScopeId: 'b' }).delete();

    // The sweep hands every journal frame without a receipt to the materialiser.
    expect(await applyInboundFrame({ db, frame: source, ring: rings.get('a')!,
      verifySignature: (candidate) => verifyFrameSignature(keys.publicKey, candidate) }))
      .toBe('superseded');
    expect((await db.notes.get(row.id))?.accessScopeId).toBe('b');
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

describe('a moved row on devices that read one scope or both', () => {
  const applyOn = (target: LoremDB, frame: EncryptedSyncFrame) => applyInboundFrame({
    db: target, frame, ring: rings.get(frame.accessScopeId)!,
    verifySignature: (candidate) => verifyFrameSignature(keys.publicKey, candidate),
  });

  /** A peer that already holds the note, then the frames the move authored. */
  const movedOnto = async (target: LoremDB): Promise<EncryptedSyncFrame[]> => {
    const row = note();
    await db.notes.put(row);
    expect(await applyOn(target, (await db.syncOperations.get(String(row.mutationId)))!)).toBe('applied');
    expect(await rescopeFrames(move())).toBe(1);
    return (await db.syncOperations.toArray())
      .filter((frame) => frame.operationId !== row.mutationId);
  };

  it('withdraws the row from a device that reads only the source scope', async () => {
    const authored = await movedOnto(peer);
    // Catch-up offers a device only the scopes it can read.
    for (const frame of authored.filter(({ accessScopeId }) => accessScopeId === 'a')) {
      expect(await applyOn(peer, frame)).toBe('applied');
    }
    expect(await peer.notes.get('n1')).toBeUndefined();
    expect(await peer.syncTombstones.get(['notes', 'n1'])).toMatchObject({ accessScopeId: 'a' });
  });

  it('delivers the row to a device that reads only the destination scope', async () => {
    await db.notes.put(note());
    expect(await rescopeFrames(move())).toBe(1);
    for (const frame of await db.syncOperations.where({ accessScopeId: 'b' }).toArray()) {
      expect(await applyOn(peer, frame)).toBe('applied');
    }
    expect((await peer.notes.get('n1'))?.accessScopeId).toBe('b');
  });

  it.each([
    ['the withdrawal', ['a', 'b']],
    ['the destination put', ['b', 'a']],
  ])('lands the row in the destination on a device reading both when %s arrives first', async (_first, order) => {
    const authored = await movedOnto(peer);
    for (const scope of order) {
      for (const frame of authored.filter(({ accessScopeId }) => accessScopeId === scope)) {
        await applyOn(peer, frame);
      }
    }
    expect((await peer.notes.get('n1'))?.accessScopeId).toBe('b');
    expect(await peer.syncTombstones.count()).toBe(0);
  });

  it('keeps the row on the moving device, with the withdrawal already settled', async () => {
    await db.notes.put(note());
    expect(await rescopeFrames(move())).toBe(1);
    const withdrawal = (await db.syncOperations.toArray()).find(({ kind }) => kind === 'delete');
    expect(withdrawal).toMatchObject({ accessScopeId: 'a', entityId: 'n1' });
    expect(await db.syncInbox.get(String(withdrawal!.operationId))).toMatchObject({ result: 'superseded' });
    expect(await db.syncTombstones.count()).toBe(0);
    expect((await db.notes.get('n1'))?.accessScopeId).toBe('b');
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import {
  NoteKind,
  NoteState,
  type Note,
  type NoteAttachment,
} from '@/db/schema';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import { asDeviceId, asOperationId, asPrincipalId } from 'writer-sync/core';
import type { ScopeKeyResolver, SyncKeyRing } from 'writer-sync/crypto';
import {
  generateDeviceIdentity,
  openOperationPayload,
  verifyFrameSignature,
  type DeviceIdentityKeys,
} from 'writer-sync/crypto';
import {
  TRANSFER_CHUNK_BYTES,
  type AttachmentChunkManifest,
} from 'writer-sync/operations';
import { createWriterFullState } from './writerFullState';

/**
 * Rebuilding a scope for a peer the journal cannot honestly answer.
 *
 * A peer that has never synchronised, or has been away past the retention
 * window, cannot be served from history: the frames are gone. What it gets
 * instead is the scope as it stands now, described in ordinary signed put
 * frames — ordinary because a rebuilt frame must be indistinguishable from a
 * journalled one to everything downstream, or the receiving device would need a
 * second way to apply it.
 */

const DEVICE = asDeviceId('device-local');

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
  mutationId: asOperationId(`op-${overrides.id ?? 'n1'}`),
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

const attachment = (): NoteAttachment => {
  const bytes = new Uint8Array(TRANSFER_CHUNK_BYTES + 7);
  return {
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
};

const fullState = () =>
  createWriterFullState({
    db,
    resolver,
    identity: () =>
      Promise.resolve({ deviceId: DEVICE, privateKey: identityKeys.privateKey }),
  });

beforeEach(async () => {
  ring = await deriveKeyRing(generateRootSecret(), 1);
  holder.ring = ring;
  identityKeys = await generateDeviceIdentity();
  db = new LoremDB('writer-full-state');
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe('createWriterFullState', () => {
  it('describes every row of the scope as a signed put frame', async () => {
    await db.notes.bulkPut([note(), note({ id: 'n2', mutationId: asOperationId('op-n2') })]);

    const frames = await fullState()('s1');

    expect(frames.map((frame) => frame.entityId).sort()).toEqual(['n1', 'n2']);
    expect(frames.every((frame) => frame.kind === 'put')).toBe(true);
    // Signed as this device's own work: a peer verifies a rebuilt frame by the
    // same rule as any other, so an unsigned one would be refused on arrival.
    for (const frame of frames) {
      expect(await verifyFrameSignature(identityKeys.publicKey, frame)).toBe(true);
    }
  });

  it('seals the row itself into the payload', async () => {
    await db.notes.put(note({ body: 'the note body' }));

    const [frame] = await fullState()('s1');

    const opened = await openOperationPayload(ring, frame, frame.payload);
    expect(opened).toMatchObject({ id: 'n1', body: 'the note body' });
  });

  it('leaves out rows belonging to another scope', async () => {
    await db.notes.bulkPut([
      note(),
      note({ id: 'n2', mutationId: asOperationId('op-n2'), accessScopeId: 's2', spaceId: 's2' }),
    ]);

    const frames = await fullState()('s1');

    expect(frames.map((frame) => frame.entityId)).toEqual(['n1']);
  });

  it('rebuilds nothing while no key resolves for the scope', async () => {
    await db.notes.put(note());
    holder.ring = null;

    // A scope this device cannot seal for is one it cannot serve. Framing the
    // rows in plaintext would hand a peer content the pairing never authorised.
    expect(await fullState()('s1')).toEqual([]);
  });

  it('rebuilds attachment rows as thin frames and persists their chunks', async () => {
    await db.noteAttachments.put(attachment());

    const [frame] = await fullState()('s1');
    const payload = await openOperationPayload(ring, frame, frame.payload);
    const manifest = payload.blobRef as AttachmentChunkManifest;

    expect(frame.entityTable).toBe('noteAttachments');
    expect(payload).not.toHaveProperty('blob');
    expect(manifest).toMatchObject({
      attachmentId: 'a1',
      chunkBytes: TRANSFER_CHUNK_BYTES,
      chunkCount: 2,
    });
    expect(
      await db.syncAttachmentChunks.where('attachmentId').equals('a1').count(),
    ).toBe(2);
  });
});

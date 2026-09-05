import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  MILLIS_PER_DAY,
  TRANSFER_CHUNK_BYTES,
  type AttachmentChunkManifest,
} from 'writer-sync/operations';
import { compactJournal } from './compactJournal';
import { applyInboundFrame } from './writerOperationMaterializer';
import { journalledDelete, journalledPut } from './writerOperationFactory';
import {
  MissingRetainedDeleteError,
  createWriterFullState,
} from './writerFullState';

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

/** `compactJournal` reads the principal its trusted devices are recorded under. */
vi.mock('@/lib/profile/profile', () => ({
  getProfile: vi.fn().mockResolvedValue({
    authorId: 'author-1',
    displayName: 'A. Writer',
    presenceHue: 'presence-1',
  }),
}));

const DEVICE = asDeviceId('device-local');
const PEER = asDeviceId('device-peer');
/** What this device accepts as an author is `writerFrameVerifier.test.ts`. */
const acceptAnyAuthor = (): Promise<boolean> => Promise.resolve(true);

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

  it('serves the scope’s deletions as the frames their authors signed', async () => {
    await db.notes.put(note({ id: 'n2', mutationId: asOperationId('op-n2') }));
    const deletion = await journalledDelete({
      db,
      ring,
      deviceId: PEER,
      entityTable: 'notes',
      entityId: 'n1',
      accessScopeId: 's1',
    });

    const frames = await fullState()('s1');

    const served = frames.find((frame) => frame.kind === 'delete');
    // The original, not a replacement: a deletion is attributed to the device
    // that made it, and re-signing it here would put this device's name on
    // someone else's decision.
    expect(served).toEqual(deletion);
    expect(frames.map((frame) => frame.entityId).sort()).toEqual(['n1', 'n2']);
  });

  it('answers a scope whose every row was deleted with the deletions', async () => {
    await journalledDelete({
      db,
      ring,
      deviceId: DEVICE,
      entityTable: 'notes',
      entityId: 'n1',
      accessScopeId: 's1',
    });

    const frames = await fullState()('s1');

    // An empty rebuild would read as "nothing to say about this scope", and the
    // peer would keep the row it still holds.
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ kind: 'delete', entityId: 'n1' });
  });

  it('leaves out deletions belonging to another scope', async () => {
    await journalledDelete({
      db,
      ring,
      deviceId: DEVICE,
      entityTable: 'notes',
      entityId: 'other',
      accessScopeId: 's2',
    });

    expect(await fullState()('s1')).toEqual([]);
  });

  it('refuses to answer when a retained deletion’s frame is gone', async () => {
    const deletion = await journalledDelete({
      db,
      ring,
      deviceId: DEVICE,
      entityTable: 'notes',
      entityId: 'n1',
      accessScopeId: 's1',
    });
    // What compaction must never do, done by hand: the tombstone stands and the
    // frame it names is gone, so the deletion can no longer be served.
    await db.syncOperations.delete(String(deletion.operationId));

    await expect(fullState()('s1')).rejects.toBeInstanceOf(MissingRetainedDeleteError);
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

describe('a device returning after the retention window', () => {
  let away: LoremDB;

  beforeEach(async () => {
    away = new LoremDB('writer-full-state-peer');
    await away.open();
  });

  afterEach(async () => {
    await away.delete();
  });

  it('converges on a deletion whose history has been compacted away', async () => {
    // Both devices hold the row; then the peer goes offline.
    await journalledPut({ db, ring, deviceId: DEVICE, entityTable: 'notes', row: note() });
    await away.notes.put(note());

    // This device deletes it and compacts far beyond the window.
    await journalledDelete({
      db,
      ring,
      deviceId: DEVICE,
      entityTable: 'notes',
      entityId: 'n1',
      accessScopeId: 's1',
    });
    await compactJournal(db, () => Date.now() + 400 * MILLIS_PER_DAY);
    expect(
      (await db.syncOperations.toArray()).map((frame) => frame.kind),
    ).toEqual(['delete']);

    // The peer reconnects asking from before the cutoff, so it is served the
    // rebuild rather than history.
    for (const frame of await fullState()('s1')) {
      await applyInboundFrame({
        db: away,
        frame: JSON.parse(JSON.stringify(frame)),
        ring,
        verifySignature: acceptAnyAuthor,
      });
    }

    expect(await away.notes.get('n1')).toBeUndefined();
    expect(await away.syncTombstones.get(['notes', 'n1'])).toBeDefined();
  });
});

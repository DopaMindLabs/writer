import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MILLIS_PER_DAY } from 'writer-sync/operations';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import { generateDeviceIdentity, publicJwkOf, signFrame } from 'writer-sync/crypto';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import { makeDeleteFrame, makePutFrame } from './writerOperationFactory';
import { tombstoneOf } from './tombstone';
import {
  TrustedDeviceStatus,
  asDeviceId,
  asOperationId,
  asPrincipalId,
  type TrustedDeviceRecord,
} from 'writer-sync/core';
import { db } from '@/db/db';
import { setJournalRetentionDays } from '@/lib/writerSyncIntegration/journalRetentionPreference';
import * as release from './releaseDeletions';
import { compactJournal } from './compactJournal';

vi.mock('@/lib/profile/profile', () => ({
  getProfile: vi.fn().mockResolvedValue({
    authorId: 'author-1',
    displayName: 'A. Writer',
    presenceHue: 'presence-1',
  }),
}));

const NOW = 1_700_000_000_000;
const ORIGIN = 'device-1';

const frameAt = (id: string, millis: number): EncryptedSyncFrame => ({
  v: 1,
  operationId: asOperationId(id),
  accessScopeId: 'scope-1',
  entityTable: 'notes',
  entityId: `entity-${id}`,
  kind: 'put',
  deviceId: asDeviceId(ORIGIN),
  logicalAt: { millis, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: 'hash',
  payload: 'cGF5bG9hZA',
  signature: '',
});

/** What materialising a frame leaves in the inbox. */
const appliedReceipt = (frame: EncryptedSyncFrame) => ({
  operationId: frame.operationId, accessScopeId: frame.accessScopeId,
  deviceId: frame.deviceId, logicalAt: frame.logicalAt,
  entityTable: frame.entityTable, entityId: frame.entityId,
  result: 'applied' as const, receivedAt: frame.logicalAt.millis,
});

const peerRecord = (options: {
  deviceId: string;
  status?: TrustedDeviceStatus;
  acknowledged?: string;
}): TrustedDeviceRecord => ({
  deviceId: asDeviceId(options.deviceId),
  publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'aQ', y: 'ag' },
  principalId: asPrincipalId('author-1'),
  addedAt: NOW - 10 * MILLIS_PER_DAY,
  displayName: 'Phone',
  status: options.status ?? TrustedDeviceStatus.Active,
  acknowledgedOperations: options.acknowledged
    ? { 'scope-1': { [ORIGIN]: asOperationId(options.acknowledged) } }
    : {},
});

const tombstone = (acknowledgedBy: string[]) => ({
  entityId: 'entity-gone',
  entityTable: 'notes',
  accessScopeId: 'scope-1',
  operationId: asOperationId('op-delete'),
  deviceId: asDeviceId(ORIGIN),
  logicalAt: { millis: NOW - MILLIS_PER_DAY, counter: 0 },
  acknowledgedBy,
});

beforeEach(async () => {
  await db.syncOperations.clear();
  await db.syncInbox.clear();
  await db.syncTombstones.clear();
  await db.syncPendingHistory.clear();
  await db.trustedDevices.clear();
  await db.meta.delete('journalRetentionDays');
});

describe('compactJournal', () => {
  it('removes frames older than the window and keeps the rest', async () => {
    await db.syncOperations.bulkPut([
      frameAt('op-old', NOW - 40 * MILLIS_PER_DAY),
      frameAt('op-fresh', NOW - 5 * MILLIS_PER_DAY),
    ]);

    const compacted = await compactJournal(db, () => NOW);

    expect(compacted.operations).toBe(1);
    const remaining = await db.syncOperations.toArray();
    expect(remaining.map((frame) => String(frame.operationId))).toEqual(['op-fresh']);
  });

  it('honours a configured window rather than the default', async () => {
    await setJournalRetentionDays(90);
    await db.syncOperations.bulkPut([frameAt('op-mid', NOW - 40 * MILLIS_PER_DAY)]);

    const compacted = await compactJournal(db, () => NOW);

    expect(compacted.operations).toBe(0);
    await expect(db.syncOperations.count()).resolves.toBe(1);
  });

  it('touches nothing when the journal is fresh and no peer is trusted', async () => {
    await db.syncOperations.bulkPut([frameAt('op-fresh', NOW - MILLIS_PER_DAY)]);

    await expect(compactJournal(db, () => NOW)).resolves.toEqual({
      operations: 0,
      tombstones: 0,
    });
    await expect(db.syncOperations.count()).resolves.toBe(1);
  });

  it('drops a fresh frame every trusted peer already holds', async () => {
    await db.syncOperations.bulkPut([frameAt('op-fresh', NOW - MILLIS_PER_DAY)]);
    await db.trustedDevices.put(
      peerRecord({ deviceId: 'peer-1', acknowledged: 'op-fresh' }),
    );

    const compacted = await compactJournal(db, () => NOW);

    expect(compacted.operations).toBe(1);
    await expect(db.syncOperations.count()).resolves.toBe(0);
  });

  it('keeps a fresh frame a trusted peer has not acknowledged', async () => {
    await db.syncOperations.bulkPut([frameAt('op-fresh', NOW - MILLIS_PER_DAY)]);
    await db.trustedDevices.bulkPut([
      peerRecord({ deviceId: 'peer-1', acknowledged: 'op-fresh' }),
      peerRecord({ deviceId: 'peer-2' }),
    ]);

    const compacted = await compactJournal(db, () => NOW);

    expect(compacted.operations).toBe(0);
    await expect(db.syncOperations.count()).resolves.toBe(1);
  });

  it('waits on no acknowledgement from a revoked device', async () => {
    await db.syncOperations.bulkPut([frameAt('op-fresh', NOW - MILLIS_PER_DAY)]);
    await db.trustedDevices.bulkPut([
      peerRecord({ deviceId: 'peer-1', acknowledged: 'op-fresh' }),
      peerRecord({ deviceId: 'peer-2', status: TrustedDeviceStatus.Revoked }),
    ]);

    await expect(compactJournal(db, () => NOW)).resolves.toMatchObject({ operations: 1 });
  });

  it('ignores devices trusted by another principal', async () => {
    await db.syncOperations.bulkPut([frameAt('op-fresh', NOW - MILLIS_PER_DAY)]);
    await db.trustedDevices.bulkPut([
      peerRecord({ deviceId: 'peer-1', acknowledged: 'op-fresh' }),
      { ...peerRecord({ deviceId: 'peer-3' }), principalId: asPrincipalId('author-2') },
    ]);

    await expect(compactJournal(db, () => NOW)).resolves.toMatchObject({ operations: 1 });
  });

  it('keeps inbox rows for the frames it drops', async () => {
    await db.syncOperations.bulkPut([frameAt('op-old', NOW - 40 * MILLIS_PER_DAY)]);
    await db.syncInbox.put({
      operationId: asOperationId('op-old'),
      accessScopeId: 'scope-1',
      deviceId: asDeviceId('device-1'),
      logicalAt: { millis: NOW - 40 * MILLIS_PER_DAY, counter: 0 },
      entityTable: 'notes',
      entityId: 'entity-op-old',
      result: 'applied',
      receivedAt: NOW - 40 * MILLIS_PER_DAY,
    });

    await compactJournal(db, () => NOW);

    await expect(db.syncInbox.count()).resolves.toBe(1);
  });

  it('keeps a delete frame the window would otherwise have taken', async () => {
    // Time alone must not release a deletion: the frame is the only signed
    // evidence of it, and a peer returning after the window is served from it.
    await db.syncOperations.put({
      ...frameAt('op-delete', NOW - 400 * MILLIS_PER_DAY),
      kind: 'delete',
      entityId: 'entity-gone',
      payload: '',
    });
    await db.syncTombstones.put(tombstone([]));
    await db.trustedDevices.put(peerRecord({ deviceId: 'peer-1' }));

    const compacted = await compactJournal(db, () => NOW);

    expect(compacted.operations).toBe(0);
    await expect(db.syncOperations.count()).resolves.toBe(1);
  });

  it('drops a delete frame in the same pass that releases its tombstone', async () => {
    const frame: EncryptedSyncFrame = {
      ...frameAt('op-delete', NOW - 400 * MILLIS_PER_DAY),
      kind: 'delete',
      entityId: 'entity-gone',
      payload: '',
    };
    await db.syncOperations.put(frame);
    await db.syncInbox.put(appliedReceipt(frame));
    await db.syncTombstones.put(tombstone(['peer-1']));
    await db.trustedDevices.put(peerRecord({ deviceId: 'peer-1' }));

    // Unanimous acknowledgement is what releases the pair, and it releases both
    // halves together — the frame is not left behind for the next pass.
    const compacted = await compactJournal(db, () => NOW);

    expect(compacted).toEqual({ operations: 1, tombstones: 1 });
    await expect(db.syncOperations.count()).resolves.toBe(0);
    await expect(db.syncTombstones.count()).resolves.toBe(0);
  });

  it('records what a released deletion settled, keeping the frames still in the window', async () => {
    const keys = await generateDeviceIdentity();
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    const author = asDeviceId('peer-1');
    const sign = async (frame: EncryptedSyncFrame): Promise<EncryptedSyncFrame> =>
      ({ ...frame, signature: await signFrame(keys.privateKey, frame) });
    const gone: Note = {
      id: 'entity-gone', accessScopeId: 'scope-1', spaceId: 'scope-1',
      createdBy: asPrincipalId('author-1'), updatedBy: asPrincipalId('author-1'),
      mutationId: asOperationId('op-put'), logicalUpdatedAt: { millis: NOW - 2 * MILLIS_PER_DAY, counter: 0 },
      l: 0, t: 0, w: 100, h: 100, kind: NoteKind.Note, state: NoteState.User,
      body: 'gone', createdAt: NOW - 2 * MILLIS_PER_DAY,
    };
    const olderPut = await sign(await makePutFrame({ ring, deviceId: author, entityTable: 'notes', row: gone }));
    const deletion = await sign({
      ...makeDeleteFrame({
        ring, deviceId: author, entityTable: 'notes', entityId: 'entity-gone', accessScopeId: 'scope-1',
      }),
      logicalAt: { millis: NOW - MILLIS_PER_DAY, counter: 0 },
    });
    await db.syncOperations.bulkPut([olderPut, deletion]);
    await db.syncTombstones.put({ ...tombstoneOf(deletion), acknowledgedBy: ['peer-1'] });
    await db.trustedDevices.put({
      ...peerRecord({ deviceId: 'peer-1' }), publicIdentityJwk: await publicJwkOf(keys.publicKey),
    });

    await expect(compactJournal(db, () => NOW)).resolves.toEqual({ operations: 0, tombstones: 1 });

    await expect(db.syncOperations.get('op-put')).resolves.toEqual(olderPut);
    await expect(db.syncInbox.get('op-put')).resolves.toMatchObject({ result: 'tombstoned' });
    await expect(db.syncInbox.get(String(deletion.operationId))).resolves.toMatchObject({ result: 'applied' });
  });

  it('keeps a deletion and its frame while older history awaits its author\'s identity', async () => {
    const pending = await generateDeviceIdentity();
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    const author = asDeviceId('device-pending');
    const gone: Note = {
      id: 'entity-gone', accessScopeId: 'scope-1', spaceId: 'scope-1',
      createdBy: asPrincipalId('author-1'), updatedBy: asPrincipalId('author-1'),
      mutationId: asOperationId('op-put'), logicalUpdatedAt: { millis: NOW - 2 * MILLIS_PER_DAY, counter: 0 },
      l: 0, t: 0, w: 100, h: 100, kind: NoteKind.Note, state: NoteState.User,
      body: 'gone', createdAt: NOW - 2 * MILLIS_PER_DAY,
    };
    const unsigned = await makePutFrame({ ring, deviceId: author, entityTable: 'notes', row: gone });
    const olderPut = { ...unsigned, signature: await signFrame(pending.privateKey, unsigned) };
    const deletion: EncryptedSyncFrame = {
      ...frameAt('op-delete', NOW - MILLIS_PER_DAY), kind: 'delete', entityId: 'entity-gone', payload: '',
    };
    await db.syncOperations.bulkPut([olderPut, deletion]);
    await db.syncInbox.put(appliedReceipt(deletion));
    // Both devices have read past the deletion; only one is known to this device yet.
    await db.syncTombstones.put(tombstone(['peer-1', 'device-pending']));
    await db.trustedDevices.put(peerRecord({ deviceId: 'peer-1' }));

    await expect(compactJournal(db, () => NOW)).resolves.toEqual({ operations: 0, tombstones: 0 });
    await expect(db.syncTombstones.count()).resolves.toBe(1);
    await expect(db.syncOperations.get('op-delete')).resolves.toEqual(deletion);

    // The author's identity arrives, and the next pass can settle what the deletion overtook.
    await db.trustedDevices.put({
      ...peerRecord({ deviceId: 'device-pending' }), publicIdentityJwk: await publicJwkOf(pending.publicKey),
    });
    await expect(compactJournal(db, () => NOW)).resolves.toMatchObject({ tombstones: 1 });
    await expect(db.syncInbox.get('op-put')).resolves.toMatchObject({ result: 'tombstoned' });
    await expect(db.syncOperations.get('op-delete')).resolves.toBeUndefined();
  });

  it('keeps a deletion whose pending history the journal loses, until its author is known', async () => {
    const pending = await generateDeviceIdentity();
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    const author = asDeviceId('device-pending');
    const gone: Note = {
      id: 'entity-gone', accessScopeId: 'scope-1', spaceId: 'scope-1',
      createdBy: asPrincipalId('author-1'), updatedBy: asPrincipalId('author-1'),
      mutationId: asOperationId('op-put'), logicalUpdatedAt: { millis: NOW - 2 * MILLIS_PER_DAY, counter: 0 },
      l: 0, t: 0, w: 100, h: 100, kind: NoteKind.Note, state: NoteState.User,
      body: 'gone', createdAt: NOW - 2 * MILLIS_PER_DAY,
    };
    const unsigned = await makePutFrame({ ring, deviceId: author, entityTable: 'notes', row: gone });
    const olderPut = { ...unsigned, signature: await signFrame(pending.privateKey, unsigned) };
    const deletion: EncryptedSyncFrame = {
      ...frameAt('op-delete', NOW - MILLIS_PER_DAY), kind: 'delete', entityId: 'entity-gone', payload: '',
    };
    await db.syncOperations.bulkPut([olderPut, deletion]);
    await db.syncInbox.put(appliedReceipt(deletion));
    await db.syncTombstones.put(tombstone(['peer-1', 'device-pending']));
    await db.trustedDevices.put(peerRecord({ deviceId: 'peer-1' }));

    await expect(compactJournal(db, () => NOW)).resolves.toMatchObject({ tombstones: 0 });
    // A compaction replicated from another device drops the put meanwhile.
    await db.syncOperations.delete('op-put');
    await expect(compactJournal(db, () => NOW)).resolves.toMatchObject({ tombstones: 0 });
    await expect(db.syncTombstones.count()).resolves.toBe(1);

    await db.trustedDevices.put({
      ...peerRecord({ deviceId: 'device-pending' }), publicIdentityJwk: await publicJwkOf(pending.publicKey),
    });
    await expect(compactJournal(db, () => NOW)).resolves.toMatchObject({ tombstones: 1 });
    // A replay of the put finds its verdict.
    await expect(db.syncInbox.get('op-put')).resolves.toMatchObject({ result: 'tombstoned' });
    await expect(db.syncPendingHistory.count()).resolves.toBe(0);
  });

  it('keeps a deletion whose pending history a provider replaced in the journal, until its author is known', async () => {
    const pending = await generateDeviceIdentity();
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    const author = asDeviceId('device-pending');
    const gone: Note = {
      id: 'entity-gone', accessScopeId: 'scope-1', spaceId: 'scope-1',
      createdBy: asPrincipalId('author-1'), updatedBy: asPrincipalId('author-1'),
      mutationId: asOperationId('op-put'), logicalUpdatedAt: { millis: NOW - 2 * MILLIS_PER_DAY, counter: 0 },
      l: 0, t: 0, w: 100, h: 100, kind: NoteKind.Note, state: NoteState.User,
      body: 'gone', createdAt: NOW - 2 * MILLIS_PER_DAY,
    };
    const unsigned = await makePutFrame({ ring, deviceId: author, entityTable: 'notes', row: gone });
    const olderPut = { ...unsigned, signature: await signFrame(pending.privateKey, unsigned) };
    const deletion: EncryptedSyncFrame = {
      ...frameAt('op-delete', NOW - MILLIS_PER_DAY), kind: 'delete', entityId: 'entity-gone', payload: '',
    };
    await db.syncOperations.bulkPut([olderPut, deletion]);
    await db.syncInbox.put(appliedReceipt(deletion));
    await db.syncTombstones.put(tombstone(['peer-1', 'device-pending']));
    await db.trustedDevices.put(peerRecord({ deviceId: 'peer-1' }));

    await expect(compactJournal(db, () => NOW)).resolves.toMatchObject({ tombstones: 0 });
    // A provider writes a row that can never be admitted under the put's id.
    await db.syncOperations.put({ ...olderPut, payloadHash: 'altered' });
    await expect(compactJournal(db, () => NOW)).resolves.toMatchObject({ tombstones: 0 });
    await expect(db.syncTombstones.count()).resolves.toBe(1);

    await db.trustedDevices.put({
      ...peerRecord({ deviceId: 'device-pending' }), publicIdentityJwk: await publicJwkOf(pending.publicKey),
    });
    await expect(compactJournal(db, () => NOW)).resolves.toMatchObject({ tombstones: 1 });
    // A replay of the genuine put finds its verdict.
    await expect(db.syncInbox.get('op-put')).resolves.toMatchObject({ result: 'tombstoned' });
    await expect(db.syncPendingHistory.count()).resolves.toBe(0);
  });

  it('keeps history awaiting its author\'s identity through the window, then settles it', async () => {
    const pending = await generateDeviceIdentity();
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    const author = asDeviceId('device-pending');
    const old = NOW - 401 * MILLIS_PER_DAY;
    const gone: Note = {
      id: 'entity-gone', accessScopeId: 'scope-1', spaceId: 'scope-1',
      createdBy: asPrincipalId('author-1'), updatedBy: asPrincipalId('author-1'),
      mutationId: asOperationId('op-put'), logicalUpdatedAt: { millis: old, counter: 0 },
      l: 0, t: 0, w: 100, h: 100, kind: NoteKind.Note, state: NoteState.User,
      body: 'gone', createdAt: old,
    };
    const unsigned = await makePutFrame({ ring, deviceId: author, entityTable: 'notes', row: gone });
    const olderPut = { ...unsigned, signature: await signFrame(pending.privateKey, unsigned) };
    const deletion: EncryptedSyncFrame = {
      ...frameAt('op-delete', NOW - 400 * MILLIS_PER_DAY), kind: 'delete', entityId: 'entity-gone', payload: '',
    };
    await db.syncOperations.bulkPut([olderPut, deletion]);
    await db.syncInbox.put(appliedReceipt(deletion));
    await db.syncTombstones.put({ ...tombstone(['peer-1', 'device-pending']), logicalAt: deletion.logicalAt });
    await db.trustedDevices.put(peerRecord({ deviceId: 'peer-1' }));

    // Past the window, but the deletion that settles it still stands: dropping it
    // now would let a replay resurrect the entity once its author is known.
    await expect(compactJournal(db, () => NOW)).resolves.toEqual({ operations: 0, tombstones: 0 });
    await expect(db.syncOperations.get('op-put')).resolves.toEqual(olderPut);

    await db.trustedDevices.put({
      ...peerRecord({ deviceId: 'device-pending' }), publicIdentityJwk: await publicJwkOf(pending.publicKey),
    });
    await expect(compactJournal(db, () => NOW)).resolves.toMatchObject({ tombstones: 1 });
    // The verdict outlives the frame: a replay of the put is a no-op.
    await expect(db.syncInbox.get('op-put')).resolves.toMatchObject({ result: 'tombstoned' });
  });

  it('settles verified history dropped from under a deletion still waited on while it is vouched for', async () => {
    const keys = await generateDeviceIdentity();
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    const author = asDeviceId('peer-1');
    const sign = async (frame: EncryptedSyncFrame): Promise<EncryptedSyncFrame> =>
      ({ ...frame, signature: await signFrame(keys.privateKey, frame) });
    const gone: Note = {
      id: 'entity-gone', accessScopeId: 'scope-1', spaceId: 'scope-1',
      createdBy: asPrincipalId('author-1'), updatedBy: asPrincipalId('author-1'),
      mutationId: asOperationId('op-put'), logicalUpdatedAt: { millis: NOW - 2 * MILLIS_PER_DAY, counter: 0 },
      l: 0, t: 0, w: 100, h: 100, kind: NoteKind.Note, state: NoteState.User,
      body: 'gone', createdAt: NOW - 2 * MILLIS_PER_DAY,
    };
    const olderPut = await sign(await makePutFrame({ ring, deviceId: author, entityTable: 'notes', row: gone }));
    const deletion = await sign({
      ...makeDeleteFrame({
        ring, deviceId: author, entityTable: 'notes', entityId: 'entity-gone', accessScopeId: 'scope-1',
      }),
      logicalAt: { millis: NOW - MILLIS_PER_DAY, counter: 0 },
    });
    // Something else is due to go, so the pass runs; the deletion is still waited on.
    await db.syncOperations.bulkPut([olderPut, deletion, frameAt('op-aged', NOW - 40 * MILLIS_PER_DAY)]);
    await db.syncTombstones.put({ ...tombstoneOf(deletion), acknowledgedBy: ['peer-1'] });
    await db.trustedDevices.bulkPut([
      { ...peerRecord({ deviceId: 'peer-1' }), publicIdentityJwk: await publicJwkOf(keys.publicKey) },
      peerRecord({ deviceId: 'peer-2' }),
    ]);
    const vouch = release.vouchForSettledHistory;
    vi.spyOn(release, 'vouchForSettledHistory').mockImplementation(async (...args) => {
      const vouched = await vouch(...args);
      // A compaction replicated from another device drops the put meanwhile.
      await db.syncOperations.delete('op-put');
      return vouched;
    });

    await expect(compactJournal(db, () => NOW)).resolves.toEqual({ operations: 1, tombstones: 0 });

    await expect(db.syncInbox.get('op-put')).resolves.toMatchObject({ result: 'tombstoned' });
    await expect(db.syncTombstones.count()).resolves.toBe(1);
    vi.restoreAllMocks();
  });

  it('settles the history the window takes from under a deletion still waited on', async () => {
    const keys = await generateDeviceIdentity();
    const ring = await deriveKeyRing(generateRootSecret(), 1);
    const old = NOW - 401 * MILLIS_PER_DAY;
    const gone: Note = {
      id: 'entity-gone', accessScopeId: 'scope-1', spaceId: 'scope-1',
      createdBy: asPrincipalId('author-1'), updatedBy: asPrincipalId('author-1'),
      mutationId: asOperationId('op-put'), logicalUpdatedAt: { millis: old, counter: 0 },
      l: 0, t: 0, w: 100, h: 100, kind: NoteKind.Note, state: NoteState.User,
      body: 'gone', createdAt: old,
    };
    const unsigned = await makePutFrame({ ring, deviceId: asDeviceId('peer-1'), entityTable: 'notes', row: gone });
    const olderPut = { ...unsigned, signature: await signFrame(keys.privateKey, unsigned) };
    const deletion: EncryptedSyncFrame = {
      ...frameAt('op-delete', NOW - 400 * MILLIS_PER_DAY), kind: 'delete', entityId: 'entity-gone', payload: '',
    };
    await db.syncOperations.bulkPut([olderPut, deletion]);
    await db.syncInbox.put(appliedReceipt(deletion));
    // Not acknowledged yet: the deletion stands, and the window reaches its history.
    await db.syncTombstones.put({ ...tombstone([]), logicalAt: deletion.logicalAt });
    await db.trustedDevices.put({
      ...peerRecord({ deviceId: 'peer-1' }), publicIdentityJwk: await publicJwkOf(keys.publicKey),
    });

    await expect(compactJournal(db, () => NOW)).resolves.toEqual({ operations: 1, tombstones: 0 });

    await expect(db.syncOperations.get('op-put')).resolves.toBeUndefined();
    await expect(db.syncInbox.get('op-put')).resolves.toMatchObject({ result: 'tombstoned' });
    await expect(db.syncTombstones.count()).resolves.toBe(1);
  });

  it('does not let an unsigned frame hold a deletion past the window', async () => {
    const deletion: EncryptedSyncFrame = {
      ...frameAt('op-delete', NOW - 400 * MILLIS_PER_DAY), kind: 'delete', entityId: 'entity-gone', payload: '',
    };
    // Unsigned: it can never be admitted, so it can never resurrect anything.
    const unverifiable: EncryptedSyncFrame = {
      ...frameAt('op-forged', NOW - 401 * MILLIS_PER_DAY), entityId: 'entity-gone',
    };
    await db.syncOperations.bulkPut([unverifiable, deletion]);
    await db.syncInbox.put(appliedReceipt(deletion));
    await db.syncTombstones.put({ ...tombstone(['peer-1']), logicalAt: deletion.logicalAt });
    await db.trustedDevices.put(peerRecord({ deviceId: 'peer-1' }));

    await expect(compactJournal(db, () => NOW)).resolves.toEqual({ operations: 2, tombstones: 1 });
    await expect(db.syncOperations.count()).resolves.toBe(0);
    await expect(db.syncInbox.get('op-forged')).resolves.toBeUndefined();
  });

  it('compacts around a row it cannot decode, and leaves that row alone', async () => {
    const deletion: EncryptedSyncFrame = {
      ...frameAt('op-delete', NOW - 400 * MILLIS_PER_DAY), kind: 'delete', entityId: 'entity-gone', payload: '',
    };
    await db.syncOperations.put(deletion);
    // A provider wrote a row for the deleted entity with no logical time: nothing
    // can order it or age it, and nothing will ever admit it.
    await db.table<Record<string, unknown>, string>('syncOperations').put({
      ...frameAt('op-malformed', NOW - 401 * MILLIS_PER_DAY), entityId: 'entity-gone', logicalAt: undefined,
    });
    await db.syncInbox.put(appliedReceipt(deletion));
    await db.syncTombstones.put({ ...tombstone(['peer-1']), logicalAt: deletion.logicalAt });
    await db.trustedDevices.put(peerRecord({ deviceId: 'peer-1' }));

    await expect(compactJournal(db, () => NOW)).resolves.toEqual({ operations: 1, tombstones: 1 });
    await expect(db.syncInbox.get('op-malformed')).resolves.toBeUndefined();
    await expect(db.syncOperations.get('op-malformed')).resolves.toBeDefined();
  });

  it('keeps a deletion that lands while the released history is being vouched for', async () => {
    const released: EncryptedSyncFrame = {
      ...frameAt('op-delete', NOW - 400 * MILLIS_PER_DAY), kind: 'delete', entityId: 'entity-gone', payload: '',
    };
    // A newer deletion of the same entity, already older than the window.
    const newer: EncryptedSyncFrame = { ...released, operationId: asOperationId('op-delete-newer'),
      logicalAt: { millis: NOW - 399 * MILLIS_PER_DAY, counter: 0 } };
    await db.syncOperations.bulkPut([released, newer]);
    await db.syncInbox.bulkPut([appliedReceipt(released), appliedReceipt(newer)]);
    await db.syncTombstones.put(tombstone(['peer-1']));
    await db.trustedDevices.put(peerRecord({ deviceId: 'peer-1' }));
    const vouch = release.vouchForSettledHistory;
    vi.spyOn(release, 'vouchForSettledHistory').mockImplementation(async (...args) => {
      const vouched = await vouch(...args);
      // Ingestion materialises the newer deletion while the crypto was running.
      await db.syncTombstones.put({ ...tombstone([]), operationId: newer.operationId, logicalAt: newer.logicalAt });
      return vouched;
    });

    await expect(compactJournal(db, () => NOW)).resolves.toMatchObject({ tombstones: 0 });

    await expect(db.syncTombstones.get(['notes', 'entity-gone']))
      .resolves.toMatchObject({ operationId: 'op-delete-newer' });
    await expect(db.syncOperations.get('op-delete-newer')).resolves.toEqual(newer);
    vi.restoreAllMocks();
  });

  it('keeps a tombstone however old while a trusted peer has not acknowledged it', async () => {
    await db.syncTombstones.put(tombstone([]));
    await db.trustedDevices.put(peerRecord({ deviceId: 'peer-1' }));

    const compacted = await compactJournal(db, () => NOW);

    expect(compacted.tombstones).toBe(0);
    await expect(db.syncTombstones.count()).resolves.toBe(1);
  });

  it('retires a tombstone every trusted peer has acknowledged', async () => {
    await db.syncTombstones.put(tombstone(['peer-1']));
    await db.trustedDevices.put(peerRecord({ deviceId: 'peer-1' }));

    const compacted = await compactJournal(db, () => NOW);

    expect(compacted.tombstones).toBe(1);
    await expect(db.syncTombstones.count()).resolves.toBe(0);
  });

  it('keeps every tombstone while no peer is trusted', async () => {
    await db.syncTombstones.put(tombstone([]));

    await expect(compactJournal(db, () => NOW)).resolves.toMatchObject({ tombstones: 0 });
    await expect(db.syncTombstones.count()).resolves.toBe(1);
  });
});

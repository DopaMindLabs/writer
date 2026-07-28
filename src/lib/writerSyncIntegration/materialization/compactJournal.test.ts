import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MILLIS_PER_DAY } from 'writer-sync/operations';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import {
  TrustedDeviceStatus,
  asDeviceId,
  asOperationId,
  asPrincipalId,
  type TrustedDeviceRecord,
} from 'writer-sync/core';
import { db } from '@/db/db';
import { setJournalRetentionDays } from '@/lib/writerSyncIntegration/journalRetentionPreference';
import { compactJournal } from './compactJournal';

vi.mock('@/lib/account/profile', () => ({
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
  await db.syncTombstones.clear();
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
      entityTable: 'notes',
      entityId: 'entity-op-old',
      result: 'applied',
      receivedAt: NOW - 40 * MILLIS_PER_DAY,
    });

    await compactJournal(db, () => NOW);

    await expect(db.syncInbox.count()).resolves.toBe(1);
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

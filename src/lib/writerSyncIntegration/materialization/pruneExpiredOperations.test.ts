import { beforeEach, describe, expect, it } from 'vitest';
import { MILLIS_PER_DAY } from 'writer-sync/operations';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import { asDeviceId, asOperationId } from 'writer-sync/core';
import { db } from '@/db/db';
import { setJournalRetentionDays } from '@/lib/writerSyncIntegration/journalRetentionPreference';
import { pruneExpiredOperations } from './pruneExpiredOperations';

const NOW = 1_700_000_000_000;

const frameAt = (id: string, millis: number): EncryptedSyncFrame => ({
  v: 1,
  operationId: asOperationId(id),
  accessScopeId: 'scope-1',
  entityTable: 'notes',
  entityId: `entity-${id}`,
  kind: 'put',
  deviceId: asDeviceId('device-1'),
  logicalAt: { millis, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: 'hash',
  payload: 'cGF5bG9hZA',
  signature: '',
});

beforeEach(async () => {
  await db.syncOperations.clear();
  await db.meta.delete('journalRetentionDays');
});

describe('pruneExpiredOperations', () => {
  it('removes frames older than the window and keeps the rest', async () => {
    await db.syncOperations.bulkPut([
      frameAt('op-old', NOW - 40 * MILLIS_PER_DAY),
      frameAt('op-fresh', NOW - 5 * MILLIS_PER_DAY),
    ]);

    const pruned = await pruneExpiredOperations(db, () => NOW);

    expect(pruned).toBe(1);
    const remaining = await db.syncOperations.toArray();
    expect(remaining.map((frame) => String(frame.operationId))).toEqual(['op-fresh']);
  });

  it('honours a configured window rather than the default', async () => {
    await setJournalRetentionDays(90);
    await db.syncOperations.bulkPut([frameAt('op-mid', NOW - 40 * MILLIS_PER_DAY)]);

    const pruned = await pruneExpiredOperations(db, () => NOW);

    expect(pruned).toBe(0);
    await expect(db.syncOperations.count()).resolves.toBe(1);
  });

  it('touches nothing when the journal is entirely fresh', async () => {
    await db.syncOperations.bulkPut([frameAt('op-fresh', NOW - MILLIS_PER_DAY)]);

    await expect(pruneExpiredOperations(db, () => NOW)).resolves.toBe(0);
    await expect(db.syncOperations.count()).resolves.toBe(1);
  });

  it('leaves inbox rows and tombstones alone', async () => {
    await db.syncOperations.bulkPut([frameAt('op-old', NOW - 40 * MILLIS_PER_DAY)]);
    await db.syncInbox.put({
      operationId: asOperationId('op-old'),
      accessScopeId: 'scope-1',
      entityTable: 'notes',
      entityId: 'entity-op-old',
      result: 'applied',
      receivedAt: NOW - 40 * MILLIS_PER_DAY,
    });
    await db.syncTombstones.put({
      entityId: 'entity-op-old',
      entityTable: 'notes',
      accessScopeId: 'scope-1',
      operationId: asOperationId('op-old'),
      deviceId: asDeviceId('device-1'),
      logicalAt: { millis: NOW - 40 * MILLIS_PER_DAY, counter: 0 },
      acknowledgedBy: [],
    });

    await pruneExpiredOperations(db, () => NOW);

    await expect(db.syncInbox.count()).resolves.toBe(1);
    await expect(db.syncTombstones.count()).resolves.toBe(1);
  });
});

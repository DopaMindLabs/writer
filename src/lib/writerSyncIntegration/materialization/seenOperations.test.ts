import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { asDeviceId, asOperationId } from 'writer-sync/core';
import type { EncryptedSyncFrame, SyncInboxEntry } from 'writer-sync/operations';
import { seenOperations } from './seenOperations';

let db: LoremDB;

const frameOf = (options: {
  id: string;
  millis: number;
  device?: string;
}): EncryptedSyncFrame => ({
  v: 1,
  operationId: asOperationId(options.id),
  accessScopeId: 'scope-1',
  entityTable: 'notes',
  entityId: `entity-${options.id}`,
  kind: 'put',
  deviceId: asDeviceId(options.device ?? 'device-a'),
  logicalAt: { millis: options.millis, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: 'hash',
  payload: 'sealed',
  signature: 'signed',
});

const inboxEntryOf = (options: {
  id: string;
  millis: number;
  device?: string;
}): SyncInboxEntry => ({
  operationId: asOperationId(options.id),
  accessScopeId: 'scope-1',
  deviceId: asDeviceId(options.device ?? 'device-a'),
  logicalAt: { millis: options.millis, counter: 0 },
  entityTable: 'notes',
  entityId: `entity-${options.id}`,
  result: 'applied',
  receivedAt: options.millis,
});

beforeEach(async () => {
  db = new LoremDB('seen-operations-test');
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe('seenOperations', () => {
  it('still names an operation whose frame compaction has dropped', async () => {
    await db.syncInbox.put(inboxEntryOf({ id: 'op-compacted', millis: 100 }));

    const seen = await seenOperations(db);

    expect(seen).toEqual([
      {
        accessScopeId: 'scope-1',
        deviceId: asDeviceId('device-a'),
        operationId: asOperationId('op-compacted'),
        logicalAt: { millis: 100, counter: 0 },
      },
    ]);
  });

  it('covers a frame journalled but not yet swept into the inbox', async () => {
    await db.syncOperations.put(frameOf({ id: 'op-unswept', millis: 200 }));

    const seen = await seenOperations(db);

    expect(seen.map((one) => String(one.operationId))).toEqual(['op-unswept']);
  });

  it('names an operation once however many records hold it', async () => {
    await db.syncOperations.put(frameOf({ id: 'op-both', millis: 300 }));
    await db.syncInbox.put(inboxEntryOf({ id: 'op-both', millis: 300 }));

    const seen = await seenOperations(db);

    expect(seen).toHaveLength(1);
  });

  it('drops an inbox row that cannot order its operation', async () => {
    // A row persisted before the inbox carried ordering fields: it can protect
    // against replay but cannot stand in for its compacted frame.
    const legacy = {
      operationId: asOperationId('op-legacy'),
      accessScopeId: 'scope-1',
      entityTable: 'notes',
      entityId: 'entity-op-legacy',
      result: 'applied',
      receivedAt: 50,
    } as SyncInboxEntry;
    await db.syncInbox.put(legacy);

    expect(await seenOperations(db)).toEqual([]);
  });

  it('lets the journal still vouch for an operation whose inbox row cannot', async () => {
    const legacy = {
      operationId: asOperationId('op-legacy'),
      accessScopeId: 'scope-1',
      entityTable: 'notes',
      entityId: 'entity-op-legacy',
      result: 'applied',
      receivedAt: 50,
    } as SyncInboxEntry;
    await db.syncInbox.put(legacy);
    await db.syncOperations.put(frameOf({ id: 'op-legacy', millis: 50 }));

    const seen = await seenOperations(db);

    expect(seen.map((one) => String(one.operationId))).toEqual(['op-legacy']);
  });
});

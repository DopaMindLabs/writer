import { beforeEach, describe, expect, it } from 'vitest';
import { asDeviceId, asOperationId } from 'writer-sync/core';
import type { EncryptedSyncFrame, SyncTombstone } from 'writer-sync/operations';
import { db } from '@/db/db';
import {
  createWriterOperationInbox,
  createWriterOperationStore,
} from './writerOperationStore';

/**
 * The Dexie-backed halves of the operation protocol. Thin by design, so these
 * assert the mapping onto Writer's tables rather than any protocol rule — the
 * rules themselves are proved in `writerOperationMaterializer.test.ts`.
 */

const store = createWriterOperationStore(db);
const inbox = createWriterOperationInbox(db);

const frameFor = (overrides: Partial<EncryptedSyncFrame> = {}): EncryptedSyncFrame => ({
  v: 1,
  operationId: asOperationId('op-1'),
  accessScopeId: 'space-1',
  entityTable: 'docs',
  entityId: 'doc-1',
  kind: 'put',
  deviceId: asDeviceId('device-1'),
  logicalAt: { millis: 1_700_000_000_000, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: 'hash',
  payload: 'sealed',
  signature: '',
  ...overrides,
});

beforeEach(async () => {
  await Promise.all([
    db.syncOperations.clear(),
    db.syncInbox.clear(),
    db.syncTombstones.clear(),
  ]);
});

describe('createWriterOperationStore', () => {
  it('appends a frame and reads it back by operation id', async () => {
    const frame = frameFor();
    await store.append(frame);
    expect(await store.byId(asOperationId('op-1'))).toMatchObject({
      operationId: 'op-1',
      payload: 'sealed',
    });
  });

  it('resolves undefined for an operation it has never seen', async () => {
    expect(await store.byId(asOperationId('never'))).toBeUndefined();
  });

  it('returns only the frames belonging to one scope', async () => {
    await store.append(frameFor());
    await store.append(
      frameFor({ operationId: asOperationId('op-2'), accessScopeId: 'space-2' }),
    );
    const found = await store.forScope('space-1');
    expect(found.map((frame) => String(frame.operationId))).toEqual(['op-1']);
  });

  it('overwrites by operation id, so a redelivered frame is stored once', async () => {
    await store.append(frameFor());
    await store.append(frameFor());
    expect(await db.syncOperations.count()).toBe(1);
  });
});

describe('createWriterOperationInbox', () => {
  it('reports whether an operation has been accepted', async () => {
    expect(await inbox.has(asOperationId('op-1'))).toBe(false);
    await inbox.record({
      operationId: asOperationId('op-1'),
      accessScopeId: 'space-1',
      deviceId: asDeviceId('device-1'),
      logicalAt: { millis: 1_700_000_000_000, counter: 0 },
      entityTable: 'docs',
      entityId: 'doc-1',
      result: 'applied',
      receivedAt: 1_700_000_000_000,
    });
    expect(await inbox.has(asOperationId('op-1'))).toBe(true);
  });

  it('stores and reads a tombstone by its entity', async () => {
    const tombstone: SyncTombstone = {
      entityId: 'doc-1',
      entityTable: 'docs',
      accessScopeId: 'space-1',
      operationId: asOperationId('op-del'),
      deviceId: asDeviceId('device-1'),
      logicalAt: { millis: 1_700_000_000_000, counter: 1 },
      acknowledgedBy: [],
    };
    await inbox.putTombstone(tombstone);
    expect(await inbox.tombstoneFor('docs', 'doc-1')).toMatchObject({
      operationId: 'op-del',
    });
  });

  it('resolves undefined when an entity has no tombstone', async () => {
    expect(await inbox.tombstoneFor('docs', 'doc-1')).toBeUndefined();
  });
});

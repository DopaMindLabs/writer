import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TrustedDeviceStatus,
  asDeviceId,
  asOperationId,
  asPrincipalId,
  type DeviceId,
} from 'writer-sync/core';
import type { EncryptedSyncFrame, SyncTombstone } from 'writer-sync/operations';
import { LoremDB } from '@/db/LoremDB';
import { createTrustedDeviceStore } from './trustedDeviceStore';
import { removeTrustedDevice } from './removeTrustedDevice';

/**
 * Removing a device and letting go of what was only being kept for it are two
 * halves of one fact. What these cover is that they land together — including
 * when the second half cannot be written.
 */

vi.mock('@/lib/profile/profile', () => ({
  getProfile: vi.fn().mockResolvedValue({
    authorId: 'author-1',
    displayName: 'A. Writer',
    presenceHue: 'presence-1',
  }),
}));

const NOW = 1_700_000_000_000;
const ORIGIN = asDeviceId('device-origin');
const PEER = asDeviceId('device-peer');
const OTHER = asDeviceId('device-other');

let db: LoremDB;

const deleteFrame: EncryptedSyncFrame = {
  v: 1,
  operationId: asOperationId('op-delete'),
  accessScopeId: 'scope-1',
  entityTable: 'notes',
  entityId: 'entity-1',
  kind: 'delete',
  deviceId: ORIGIN,
  logicalAt: { millis: NOW - 1_000, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: 'hash',
  payload: '',
  signature: 'signed',
};

const tombstone: SyncTombstone = {
  entityId: deleteFrame.entityId,
  entityTable: deleteFrame.entityTable,
  accessScopeId: deleteFrame.accessScopeId,
  operationId: deleteFrame.operationId,
  deviceId: deleteFrame.deviceId,
  logicalAt: deleteFrame.logicalAt,
  acknowledgedBy: [],
};

const trust = async (deviceId: DeviceId): Promise<void> => {
  await createTrustedDeviceStore(db).trust({
    deviceId,
    publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'aQ', y: 'ag' },
    principalId: asPrincipalId('author-1'),
    addedAt: NOW,
    lastSessionAt: NOW,
    displayName: 'Phone',
    status: TrustedDeviceStatus.Active,
    acknowledgedOperations: {},
  });
};

beforeEach(async () => {
  db = new LoremDB('remove-trusted-device');
  await db.open();
  await db.syncOperations.put(deleteFrame);
  await db.syncTombstones.put(tombstone);
});

afterEach(async () => {
  await db.delete();
});

describe('removeTrustedDevice', () => {
  it('revokes the device and releases what was held for it', async () => {
    await trust(PEER);

    await removeTrustedDevice({ db, deviceId: PEER, at: NOW });

    const record = await db.trustedDevices.get(String(PEER));
    expect(record?.status).toBe(TrustedDeviceStatus.Revoked);
    expect(record?.revokedAt).toBe(NOW);
    expect(await db.syncTombstones.count()).toBe(0);
    expect(await db.syncOperations.get('op-delete')).toBeUndefined();
  });

  it('leaves all three tables as it found them when the release cannot be written', async () => {
    await trust(PEER);
    await trust(OTHER);
    await db.syncTombstones.put({ ...tombstone, acknowledgedBy: [OTHER] });

    // The last write of the removal fails. Everything before it is a change
    // this device would otherwise be left with and never revisit: a revoked
    // peer, and deletion state pinned by nobody.
    const refuse = (): never => {
      throw new Error('the journal refused this delete');
    };
    db.syncOperations.hook('deleting', refuse);

    await expect(removeTrustedDevice({ db, deviceId: PEER, at: NOW })).rejects.toThrow(
      /refused this delete/,
    );
    db.syncOperations.hook('deleting').unsubscribe(refuse);

    const record = await db.trustedDevices.get(String(PEER));
    expect(record?.status).toBe(TrustedDeviceStatus.Active);
    expect(record?.revokedAt).toBeUndefined();
    expect(await db.syncTombstones.count()).toBe(1);
    expect(await db.syncOperations.get('op-delete')).toBeDefined();
  });
});

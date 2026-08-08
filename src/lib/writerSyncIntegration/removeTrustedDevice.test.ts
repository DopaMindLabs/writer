import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TrustedDeviceStatus,
  asDeviceId,
  asOperationId,
  asPrincipalId,
  type DeviceId,
} from 'writer-sync/core';
import type { EncryptedSyncFrame, SyncTombstone } from 'writer-sync/operations';
import type { PeerLinkState, PeerSession } from 'writer-sync/providers/webrtc';
import { LoremDB } from '@/db/LoremDB';
import { createTrustedDeviceStore } from './trustedDeviceStore';
import { createPeerSessionRegistry } from './peerSessionRegistry';
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

/** A session that records whether it was closed. */
const fakeSession = () => {
  let closed = false;
  const session = {
    channel: () => null,
    onChannel: () => () => undefined,
    onAnyChannel: () => () => undefined,
    openChannel: () => new Promise<never>(() => undefined),
    createOffer: () => Promise.resolve(''),
    acceptOffer: () => Promise.resolve(''),
    acceptAnswer: () => Promise.resolve(),
    linkState: (): PeerLinkState => 'connected',
    onLinkStateChange: () => () => undefined,
    close: () => {
      closed = true;
    },
  } as unknown as PeerSession;
  return Object.assign(session, { isClosed: () => closed });
};

/** A registry holding one live session for the device about to be removed. */
const connected = (deviceId: DeviceId = PEER) => {
  const registry = createPeerSessionRegistry();
  const session = fakeSession();
  registry.add({ session, deviceId });
  return Object.assign(registry, { session });
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

    await removeTrustedDevice({ db, deviceId: PEER, at: NOW, sessions: connected() });

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
    const sessions = connected();

    await expect(
      removeTrustedDevice({ db, deviceId: PEER, at: NOW, sessions }),
    ).rejects.toThrow(/refused this delete/);
    db.syncOperations.hook('deleting').unsubscribe(refuse);

    const record = await db.trustedDevices.get(String(PEER));
    expect(record?.status).toBe(TrustedDeviceStatus.Active);
    expect(record?.revokedAt).toBeUndefined();
    expect(await db.syncTombstones.count()).toBe(1);
    expect(await db.syncOperations.get('op-delete')).toBeDefined();
    // Still trusted, so still connected: the removal is not a fact yet.
    expect(sessions.session.isClosed()).toBe(false);
  });

  it('closes the removed device’s live session', async () => {
    await trust(PEER);
    const sessions = connected();

    await removeTrustedDevice({ db, deviceId: PEER, at: NOW, sessions });

    expect(sessions.session.isClosed()).toBe(true);
    expect(sessions.peers()).toHaveLength(0);
  });

  it('leaves a device that is not being removed connected', async () => {
    await trust(PEER);
    await trust(OTHER);
    const sessions = connected(OTHER);

    await removeTrustedDevice({ db, deviceId: PEER, at: NOW, sessions });

    expect(sessions.session.isClosed()).toBe(false);
  });
});

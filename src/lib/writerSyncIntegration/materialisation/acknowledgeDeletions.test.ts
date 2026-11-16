import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import {
  TrustedDeviceStatus,
  asDeviceId,
  asOperationId,
  asPrincipalId,
  type DeviceId,
} from 'writer-sync/core';
import type { EncryptedSyncFrame, SyncTombstone } from 'writer-sync/operations';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';
import { removeTrustedDevice } from '@/lib/writerSyncIntegration/removeTrustedDevice';
import { compactJournal } from './compactJournal';
import { recordPeerAcknowledgement } from './acknowledgeDeletions';

/**
 * What an acknowledgement does to the deletions it covers, driven through the
 * registry the peer session actually calls — never by writing `acknowledgedBy`
 * by hand, which is what let this path look connected while nothing joined it.
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

const frameAt = (options: {
  id: string;
  millis: number;
  kind?: 'put' | 'delete';
  scope?: string;
  device?: DeviceId;
}): EncryptedSyncFrame => ({
  v: 1,
  operationId: asOperationId(options.id),
  accessScopeId: options.scope ?? 'scope-1',
  entityTable: 'notes',
  entityId: `entity-${options.id}`,
  kind: options.kind ?? 'put',
  deviceId: options.device ?? ORIGIN,
  logicalAt: { millis: options.millis, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: 'hash',
  payload: options.kind === 'delete' ? '' : 'cGF5bG9hZA',
  signature: 'signed',
});

const tombstoneFor = (frame: EncryptedSyncFrame): SyncTombstone => ({
  entityId: frame.entityId,
  entityTable: frame.entityTable,
  accessScopeId: frame.accessScopeId,
  operationId: frame.operationId,
  deviceId: frame.deviceId,
  logicalAt: frame.logicalAt,
  acknowledgedBy: [],
});

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

/** The peer says it has read `origin` up to `operationId` in `scope-1`. */
const acknowledge = (options: {
  deviceId: DeviceId;
  operationId: string;
  scope?: string;
}): Promise<void> =>
  recordPeerAcknowledgement({
    db,
    registry: createTrustedDeviceStore(db),
    acknowledgement: {
      deviceId: options.deviceId,
      accessScopeId: options.scope ?? 'scope-1',
      originDeviceId: ORIGIN,
      operationId: asOperationId(options.operationId),
    },
  });

const acknowledgedBy = async (): Promise<string[]> =>
  (await db.syncTombstones.get(['notes', 'entity-op-delete']))?.acknowledgedBy ?? [];

beforeEach(async () => {
  db = new LoremDB('acknowledge-deletions');
  await db.open();
  // Old enough that the retention window would have taken it long ago: what
  // holds it is the tombstone, and what releases it is acknowledgement.
  const deletion = frameAt({
    id: 'op-delete',
    millis: NOW - 400 * 86_400_000,
    kind: 'delete',
  });
  await db.syncOperations.put(deletion);
  await db.syncTombstones.put(tombstoneFor(deletion));
});

afterEach(async () => {
  await db.delete();
});

describe('recordPeerAcknowledgement', () => {
  it('marks a deletion the acknowledgement has read past', async () => {
    await trust(PEER);
    await db.syncOperations.put(frameAt({ id: 'op-later', millis: NOW }));

    await acknowledge({ deviceId: PEER, operationId: 'op-later' });

    expect(await acknowledgedBy()).toEqual([String(PEER)]);
  });

  it('marks a deletion the acknowledgement names exactly', async () => {
    await trust(PEER);

    await acknowledge({ deviceId: PEER, operationId: 'op-delete' });

    expect(await acknowledgedBy()).toEqual([String(PEER)]);
  });

  it('leaves a deletion the peer has not reached', async () => {
    await trust(PEER);
    await db.syncOperations.put(
      frameAt({ id: 'op-earlier', millis: NOW - 401 * 86_400_000 }),
    );

    await acknowledge({ deviceId: PEER, operationId: 'op-earlier' });

    expect(await acknowledgedBy()).toEqual([]);
  });

  it('leaves a deletion in another scope alone', async () => {
    await trust(PEER);
    await db.syncOperations.put(
      frameAt({ id: 'op-elsewhere', millis: NOW, scope: 'scope-2' }),
    );

    await acknowledge({ deviceId: PEER, operationId: 'op-elsewhere', scope: 'scope-2' });

    expect(await acknowledgedBy()).toEqual([]);
  });

  it('leaves a deletion from another origin alone', async () => {
    await trust(PEER);
    const elsewhere = frameAt({
      id: 'op-other-delete',
      millis: NOW - 5_000,
      kind: 'delete',
      device: OTHER,
    });
    await db.syncOperations.put(elsewhere);
    await db.syncTombstones.put(tombstoneFor(elsewhere));
    await db.syncOperations.put(frameAt({ id: 'op-later', millis: NOW }));

    await acknowledge({ deviceId: PEER, operationId: 'op-later' });

    // One device's position says nothing about another's, which is the whole
    // reason acknowledgement is recorded per origin.
    const untouched = await db.syncTombstones.get(['notes', 'entity-op-other-delete']);
    expect(untouched?.acknowledgedBy).toEqual([]);
  });

  it('says the same thing twice without saying it twice', async () => {
    await trust(PEER);

    await acknowledge({ deviceId: PEER, operationId: 'op-delete' });
    await acknowledge({ deviceId: PEER, operationId: 'op-delete' });

    expect(await acknowledgedBy()).toEqual([String(PEER)]);
  });

  it('advances the peer watermark as well', async () => {
    await trust(PEER);

    await acknowledge({ deviceId: PEER, operationId: 'op-delete' });

    const record = await db.trustedDevices.get(String(PEER));
    expect(record?.acknowledgedOperations['scope-1']?.[String(ORIGIN)]).toBe('op-delete');
  });
});

describe('what an acknowledgement releases', () => {
  it('lets compaction drop the deletion and its frame together', async () => {
    await trust(PEER);

    await acknowledge({ deviceId: PEER, operationId: 'op-delete' });
    const compacted = await compactJournal(db, () => NOW);

    expect(compacted.tombstones).toBe(1);
    expect(await db.syncTombstones.count()).toBe(0);
    // The pair goes together: a frame left behind is a deletion nothing
    // refuses, and a tombstone left behind is one no rebuild can serve.
    expect(await db.syncOperations.get('op-delete')).toBeUndefined();
  });

  it('keeps it while one trusted peer has not acknowledged', async () => {
    await trust(PEER);
    await trust(OTHER);

    await acknowledge({ deviceId: PEER, operationId: 'op-delete' });
    await compactJournal(db, () => NOW);

    expect(await db.syncTombstones.count()).toBe(1);
    expect(await db.syncOperations.get('op-delete')).toBeDefined();
  });

  it('releases it when the peer that never acknowledged is removed', async () => {
    await trust(PEER);
    await trust(OTHER);
    await acknowledge({ deviceId: PEER, operationId: 'op-delete' });

    await removeTrustedDevice({ db, deviceId: OTHER, at: NOW });

    // Removing the device that was holding it is the release valve deletion
    // state has; there is no window that would ever have done it.
    expect(await db.syncTombstones.count()).toBe(0);
    expect(await db.syncOperations.get('op-delete')).toBeUndefined();
  });

  it('releases it when the last device of all is removed', async () => {
    await trust(PEER);

    await removeTrustedDevice({ db, deviceId: PEER, at: NOW });

    // Nobody left to wait for and nobody coming back. A routine pass holds in
    // that state, deliberately; a removal does not.
    expect(await db.syncTombstones.count()).toBe(0);
    expect(await db.syncOperations.get('op-delete')).toBeUndefined();
  });

  it('holds while there is simply no peer paired yet', async () => {
    await compactJournal(db, () => NOW);

    // A device between pairings has not finished with them: a peer paired
    // tomorrow could still be holding what was deleted today.
    expect(await db.syncTombstones.count()).toBe(1);
    expect(await db.syncOperations.get('op-delete')).toBeDefined();
  });
});

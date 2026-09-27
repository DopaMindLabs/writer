import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { deriveKeyRing, generateRootSecret } from '@/lib/cloud/crypto/keys';
import {
  asDeviceId, asOperationId, asPrincipalId, TrustedDeviceStatus, type DeviceId,
} from 'writer-sync/core';
import {
  generateDeviceIdentity, publicJwkOf, signFrame,
  type DeviceIdentityKeys, type SyncKeyRing,
} from 'writer-sync/crypto';
import type { EncryptedSyncFrame, SyncTombstone } from 'writer-sync/operations';
import { createTrustedDeviceStore } from '@/lib/writerSyncIntegration/trustedDeviceStore';
import { makeDeleteFrame, makePutFrame } from './writerOperationFactory';
import { tombstoneOf } from './tombstone';
import { keepPendingHistory, releaseDeletions, vouchForSettledHistory } from './releaseDeletions';

/**
 * A receipt tells ingestion an operation is finished with. Releasing a
 * deletion may write one only for history this device can vouch for: anything
 * a provider wrote that fails admission must stay inert, never gain a receipt
 * that a genuine operation with the same id would later be skipped against.
 */

const AUTHOR = asDeviceId('trusted-author');
const STRANGER = asDeviceId('stranger');

let db: LoremDB;
let ring: SyncKeyRing;
let author: DeviceIdentityKeys;
let stranger: DeviceIdentityKeys;

const note = (id: string, millis: number): Note => ({
  id: 'n1', accessScopeId: 'scope-1', spaceId: 'scope-1',
  createdBy: asPrincipalId('me'), updatedBy: asPrincipalId('me'),
  mutationId: asOperationId(id), logicalUpdatedAt: { millis, counter: 0 },
  l: 0, t: 0, w: 100, h: 100, kind: NoteKind.Note, state: NoteState.User,
  body: 'body', createdAt: millis,
});

const signed = async (
  frame: EncryptedSyncFrame,
  keys: DeviceIdentityKeys,
): Promise<EncryptedSyncFrame> => ({ ...frame, signature: await signFrame(keys.privateKey, frame) });

const put = async (id: string, millis: number, deviceId: DeviceId = AUTHOR) =>
  signed(
    await makePutFrame({ ring, deviceId, entityTable: 'notes', row: note(id, millis) }),
    deviceId === AUTHOR ? author : stranger,
  );

/** The deletion: its frame retained, its tombstone standing, as a local delete leaves them. */
const deletion = async (): Promise<SyncTombstone> => {
  const frame = await signed({
    ...makeDeleteFrame({
      ring, deviceId: AUTHOR, entityTable: 'notes', entityId: 'n1', accessScopeId: 'scope-1',
    }),
    logicalAt: { millis: 5000, counter: 0 },
  }, author);
  await db.syncOperations.put(frame);
  const tombstone = tombstoneOf(frame);
  await db.syncTombstones.put(tombstone);
  return tombstone;
};

/** A release as compaction and device removal run it, keeping pending history. */
const release = async (released: readonly SyncTombstone[]): Promise<void> => {
  const vouched = await vouchForSettledHistory(db, released);
  await db.transaction(
    'rw',
    [db.syncOperations, db.syncTombstones, db.syncInbox, db.syncPendingHistory],
    async () => {
      await releaseDeletions(db, released, vouched);
      await keepPendingHistory(db, vouched);
    },
  );
};

beforeEach(async () => {
  db = new LoremDB('release-deletions');
  await db.open();
  ring = await deriveKeyRing(generateRootSecret(), 1);
  author = await generateDeviceIdentity();
  stranger = await generateDeviceIdentity();
  await createTrustedDeviceStore(db).trust({
    deviceId: AUTHOR, publicIdentityJwk: await publicJwkOf(author.publicKey),
    principalId: asPrincipalId('me'), status: TrustedDeviceStatus.Active,
    addedAt: 1000, lastSessionAt: 1000, displayName: 'Author', acknowledgedOperations: {},
  });
});

afterEach(async () => {
  await db.delete();
});

describe('releaseDeletions', () => {
  it('settles the verified history a deletion overtook, and releases the deletion', async () => {
    const older = await put('op-older', 2000);
    await db.syncOperations.put(older);
    const tombstone = await deletion();

    await release([tombstone]);

    expect(await db.syncInbox.get('op-older')).toMatchObject({ result: 'tombstoned' });
    expect(await db.syncInbox.get(String(tombstone.operationId))).toMatchObject({ result: 'applied' });
    expect(await db.syncTombstones.count()).toBe(0);
    expect(await db.syncOperations.get(String(tombstone.operationId))).toBeUndefined();
    expect(await db.syncOperations.get('op-older')).toEqual(older);
  });

  it('keeps the deletion while older history is signed by a device it does not know yet', async () => {
    await db.syncOperations.put(await put('op-pending', 2000, STRANGER));
    const tombstone = await deletion();

    await release([tombstone]);

    expect(await db.syncInbox.get('op-pending')).toBeUndefined();
    expect(await db.syncTombstones.count()).toBe(1);
    expect(await db.syncOperations.get(String(tombstone.operationId))).toBeDefined();
  });

  it.each([
    ['unsigned', async () => ({ ...(await put('op-forged', 2000)), signature: '' })],
    ['altered after signing', async () => ({ ...(await put('op-forged', 2000)), payload: btoa('forged') })],
    // Its author's key is known, and a device id names one key: it never verifies.
    ['signed with a key its author does not hold', async () => signed(await makePutFrame({
      ring, deviceId: AUTHOR, entityTable: 'notes', row: note('op-forged', 2000),
    }), stranger)],
  ])('does not let %s history, which can never be admitted, hold the deletion', async (_case, forge) => {
    await db.syncOperations.put(await forge());
    const tombstone = await deletion();

    await release([tombstone]);

    expect(await db.syncInbox.get('op-forged')).toBeUndefined();
    expect(await db.syncTombstones.count()).toBe(0);
    expect(await db.syncOperations.get(String(tombstone.operationId))).toBeUndefined();
  });

  it.each([
    ['no logical time', { logicalAt: undefined }],
    ['a logical time that is not a number', { logicalAt: { millis: '2000', counter: 0 } }],
  ])('treats history with %s, which nothing can order or admit, as inert', async (_case, damage) => {
    await db.table<Record<string, unknown>, string>('syncOperations')
      .put({ ...(await put('op-malformed', 2000)), ...damage });
    const tombstone = await deletion();

    await release([tombstone]);

    expect(await db.syncInbox.get('op-malformed')).toBeUndefined();
    expect(await db.syncTombstones.count()).toBe(0);
    expect(await db.syncOperations.get(String(tombstone.operationId))).toBeUndefined();
  });

  it('releases the deletion once history that awaited its author\'s identity verifies', async () => {
    await db.syncOperations.put(await put('op-pending', 2000, STRANGER));
    const tombstone = await deletion();

    await release([tombstone]);
    expect(await db.syncTombstones.count()).toBe(1);
    expect(await db.syncInbox.count()).toBe(0);

    // The author's identity arrives later, and with it the put becomes verifiable.
    await createTrustedDeviceStore(db).trust({
      deviceId: STRANGER, publicIdentityJwk: await publicJwkOf(stranger.publicKey),
      principalId: asPrincipalId('me'), status: TrustedDeviceStatus.Active,
      addedAt: 1000, lastSessionAt: 1000, displayName: 'Late', acknowledgedOperations: {},
    });
    await release([tombstone]);

    expect(await db.syncInbox.get('op-pending')).toMatchObject({ result: 'tombstoned' });
    expect(await db.syncTombstones.count()).toBe(0);
    expect(await db.syncOperations.get(String(tombstone.operationId))).toBeUndefined();
  });

  it('gives no receipt when the retained frame changed after it was verified', async () => {
    await db.syncOperations.put(await put('op-older', 2000));
    const tombstone = await deletion();
    const vouched = await vouchForSettledHistory(db, [tombstone]);
    await db.syncOperations.put(await put('op-older', 2500, STRANGER));

    await db.transaction('rw', [db.syncOperations, db.syncTombstones, db.syncInbox], () =>
      releaseDeletions(db, [tombstone], vouched));

    expect(await db.syncInbox.get('op-older')).toBeUndefined();
    expect(await db.syncTombstones.count()).toBe(1);
  });

  it('gives no receipt when the retained frame keeps its signature but not its content', async () => {
    const older = await put('op-older', 2000);
    await db.syncOperations.put(older);
    const tombstone = await deletion();
    const vouched = await vouchForSettledHistory(db, [tombstone]);
    // Swapped after verification: the signature is copied onto altered content.
    await db.syncOperations.put({ ...older, payload: btoa('swapped') });

    await db.transaction('rw', [db.syncOperations, db.syncTombstones, db.syncInbox], () =>
      releaseDeletions(db, [tombstone], vouched));

    expect(await db.syncInbox.get('op-older')).toBeUndefined();
    expect(await db.syncTombstones.count()).toBe(1);
  });

  it('settles verified history that leaves the journal after it was vouched for', async () => {
    await db.syncOperations.put(await put('op-older', 2000));
    const tombstone = await deletion();
    const vouched = await vouchForSettledHistory(db, [tombstone]);
    // A compaction replicated from another device drops the frame meanwhile.
    await db.syncOperations.delete('op-older');

    await db.transaction('rw', [db.syncOperations, db.syncTombstones, db.syncInbox], () =>
      releaseDeletions(db, [tombstone], vouched));

    expect(await db.syncInbox.get('op-older')).toMatchObject({ result: 'tombstoned' });
    expect(await db.syncTombstones.count()).toBe(0);
  });

  it('keeps the deletion when history awaiting its author leaves the journal after it was vouched for', async () => {
    await db.syncOperations.put(await put('op-pending', 2000, STRANGER));
    const tombstone = await deletion();
    const vouched = await vouchForSettledHistory(db, [tombstone]);
    await db.syncOperations.delete('op-pending');

    await db.transaction('rw', [db.syncOperations, db.syncTombstones, db.syncInbox], () =>
      releaseDeletions(db, [tombstone], vouched));

    expect(await db.syncInbox.get('op-pending')).toBeUndefined();
    expect(await db.syncTombstones.count()).toBe(1);
  });

  it('keeps the deletion across passes while history awaiting its author is out of the journal', async () => {
    await db.syncOperations.put(await put('op-pending', 2000, STRANGER));
    const tombstone = await deletion();
    await release([tombstone]);
    // A compaction replicated from another device drops the frame.
    await db.syncOperations.delete('op-pending');

    await release([tombstone]);
    expect(await db.syncTombstones.count()).toBe(1);

    // The author's identity arrives: the copy kept verifies, and the deletion settles it.
    await createTrustedDeviceStore(db).trust({
      deviceId: STRANGER, publicIdentityJwk: await publicJwkOf(stranger.publicKey),
      principalId: asPrincipalId('me'), status: TrustedDeviceStatus.Active,
      addedAt: 1000, lastSessionAt: 1000, displayName: 'Late', acknowledgedOperations: {},
    });
    await release([tombstone]);

    expect(await db.syncInbox.get('op-pending')).toMatchObject({ result: 'tombstoned' });
    expect(await db.syncTombstones.count()).toBe(0);
    expect(await db.syncPendingHistory.count()).toBe(0);
  });

  it('forgets kept history that can never be admitted', async () => {
    const forged = { ...(await put('op-forged', 2000)), payload: btoa('forged') };
    await db.syncPendingHistory.put(forged);
    const tombstone = await deletion();

    await release([tombstone]);

    expect(await db.syncPendingHistory.count()).toBe(0);
    expect(await db.syncTombstones.count()).toBe(0);
  });

  it('leaves a later deletion that replaced the tombstone after it was vouched for', async () => {
    await db.syncOperations.put(await put('op-older', 2000));
    const tombstone = await deletion();
    const vouched = await vouchForSettledHistory(db, [tombstone]);
    // Ingestion materialises a newer deletion of the entity while the crypto runs.
    const later = await signed({
      ...makeDeleteFrame({
        ring, deviceId: AUTHOR, entityTable: 'notes', entityId: 'n1', accessScopeId: 'scope-1',
      }),
      logicalAt: { millis: 7000, counter: 0 },
    }, author);
    await db.syncOperations.put(later);
    await db.syncTombstones.put(tombstoneOf(later));

    await db.transaction('rw', [db.syncOperations, db.syncTombstones, db.syncInbox], () =>
      releaseDeletions(db, [tombstone], vouched));

    expect(await db.syncTombstones.get(['notes', 'n1'])).toEqual(tombstoneOf(later));
    expect(await db.syncOperations.get(String(later.operationId))).toEqual(later);
  });

  it('leaves a later operation and an existing receipt alone', async () => {
    await db.syncOperations.bulkPut([await put('op-received', 1500), await put('op-later', 9000)]);
    await db.syncInbox.put({
      operationId: asOperationId('op-received'), accessScopeId: 'scope-1', deviceId: AUTHOR,
      logicalAt: { millis: 1500, counter: 0 }, entityTable: 'notes', entityId: 'n1',
      result: 'applied', receivedAt: 1500,
    });
    const tombstone = await deletion();

    await release([tombstone]);

    expect(await db.syncInbox.get('op-received')).toMatchObject({ result: 'applied' });
    expect(await db.syncInbox.get('op-later')).toBeUndefined();
  });
});

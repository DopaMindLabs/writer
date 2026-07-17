import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { saveDeviceKeyRing, forgetDeviceKeyRing } from './crypto/keyStore';
import { deriveKeyRing, generateMasterSecret } from './crypto/keys';
import {
  DEVICE_REFRESH_INTERVAL_MS,
  DEVICE_STALE_AFTER_MS,
} from './devicePolicy';
import { registerThisDevice, releaseThisDevice } from './deviceRegistry';

const FIXED_TIME = 1_700_000_000_000;

/** The slice of `db.cloud` the registry reads, faked per test. */
interface FakeCloud {
  currentUser: { value: { isLoggedIn: boolean } };
  persistedSyncState: {
    value?: { initiallySynced?: boolean; clientIdentity?: string };
  };
}

let db: LoremDB;

const withCloud = (cloud: FakeCloud): void => {
  (db as unknown as { cloud?: FakeCloud }).cloud = cloud;
};

const joinedCloud = (clientIdentity = 'device-1'): FakeCloud => ({
  currentUser: { value: { isLoggedIn: true } },
  persistedSyncState: { value: { initiallySynced: true, clientIdentity } },
});

let nowSpy: MockInstance<() => number>;

beforeEach(async () => {
  // Pin the clock without faking timers — fake timers stall fake-indexeddb.
  nowSpy = vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIME);
  await forgetDeviceKeyRing();
  // A cloud-schema database (no addon needed): declares the cloudDevices table.
  db = new LoremDB('device-registry-test', { cloud: true });
  await db.open();
});

afterEach(async () => {
  nowSpy.mockRestore();
  await forgetDeviceKeyRing();
  await db.delete();
});

const acquireKey = async (): Promise<void> => {
  await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(generateMasterSecret(), 1) });
};

describe('registerThisDevice', () => {
  it('does nothing while the device is keyless', async () => {
    withCloud(joinedCloud());
    await registerThisDevice(db);
    expect(await db.cloudDevices.count()).toBe(0);
  });

  it('does nothing before the initial pull completes', async () => {
    await acquireKey();
    withCloud({
      currentUser: { value: { isLoggedIn: true } },
      persistedSyncState: { value: { initiallySynced: false, clientIdentity: 'device-1' } },
    });
    await registerThisDevice(db);
    expect(await db.cloudDevices.count()).toBe(0);
  });

  it('registers the device once it holds a key and the pull is complete', async () => {
    await acquireKey();
    withCloud(joinedCloud('device-1'));

    await registerThisDevice(db);

    const row = await db.cloudDevices.get('device-1');
    expect(row).toEqual({
      id: 'device-1',
      joinedAt: FIXED_TIME,
      lastSeenAt: FIXED_TIME,
    });
  });

  it('does not write again while the row is still fresh', async () => {
    // The sync-loop regression. cloudDevices is a synced table, so a put is a
    // real mutation even when the row is byte-identical: it pushes, the push
    // settles the sync round, the settle re-runs the registrar, and it writes
    // again — for ever. This must therefore assert that no write happened, not
    // that the stored value is unchanged; a value comparison passes happily
    // while the loop is running.
    await acquireKey();
    withCloud(joinedCloud('device-1'));
    await registerThisDevice(db);

    const put = vi.spyOn(db.cloudDevices, 'put');
    nowSpy.mockReturnValue(FIXED_TIME + 60_000);
    await registerThisDevice(db);

    expect(put).not.toHaveBeenCalled();
    const row = await db.cloudDevices.get('device-1');
    expect(row?.lastSeenAt).toBe(FIXED_TIME);
    put.mockRestore();
  });

  it('refreshes lastSeenAt once the refresh interval has elapsed', async () => {
    await acquireKey();
    withCloud(joinedCloud('device-1'));
    await registerThisDevice(db);

    nowSpy.mockReturnValue(FIXED_TIME + DEVICE_REFRESH_INTERVAL_MS);
    await registerThisDevice(db);

    const row = await db.cloudDevices.get('device-1');
    expect(row?.joinedAt).toBe(FIXED_TIME);
    expect(row?.lastSeenAt).toBe(FIXED_TIME + DEVICE_REFRESH_INTERVAL_MS);
  });

  it('reclaims a stale peer’s slot, and deletes it only once', async () => {
    await acquireKey();
    withCloud(joinedCloud('device-1'));
    const stale = FIXED_TIME - DEVICE_STALE_AFTER_MS - 1;
    await db.cloudDevices.bulkPut([
      { id: 'a', joinedAt: stale, lastSeenAt: FIXED_TIME },
      { id: 'b', joinedAt: stale, lastSeenAt: FIXED_TIME },
      { id: 'c', joinedAt: stale, lastSeenAt: FIXED_TIME },
      { id: 'dead', joinedAt: stale, lastSeenAt: stale },
    ]);

    await registerThisDevice(db);

    expect(await db.cloudDevices.get('dead')).toBeUndefined();
    expect(await db.cloudDevices.get('device-1')).toBeDefined();

    const remove = vi.spyOn(db.cloudDevices, 'bulkDelete');
    await registerThisDevice(db);
    expect(remove).not.toHaveBeenCalled();
    remove.mockRestore();
  });

  it('does not rejoin past the limit when its row was removed', async () => {
    // A keyed device whose slot was revoked or reclaimed must not silently walk
    // back in over a full registry.
    await acquireKey();
    withCloud(joinedCloud('device-1'));
    await db.cloudDevices.bulkPut(
      ['a', 'b', 'c', 'd'].map((id) => ({
        id,
        joinedAt: FIXED_TIME,
        lastSeenAt: FIXED_TIME,
      })),
    );

    await registerThisDevice(db);

    expect(await db.cloudDevices.get('device-1')).toBeUndefined();
    expect(await db.cloudDevices.count()).toBe(4);
  });

  it('never rewrites a revoked row', async () => {
    await acquireKey();
    withCloud(joinedCloud('device-1'));
    await db.cloudDevices.put({
      id: 'device-1',
      joinedAt: FIXED_TIME,
      lastSeenAt: FIXED_TIME,
      revokedAt: FIXED_TIME,
    });

    nowSpy.mockReturnValue(FIXED_TIME + DEVICE_REFRESH_INTERVAL_MS);
    await registerThisDevice(db);

    const row = await db.cloudDevices.get('device-1');
    expect(row?.revokedAt).toBe(FIXED_TIME);
    expect(row?.lastSeenAt).toBe(FIXED_TIME);
  });
});

describe('releaseThisDevice', () => {
  it('removes only this device’s row', async () => {
    await acquireKey();
    withCloud(joinedCloud('device-1'));
    await registerThisDevice(db);
    await db.cloudDevices.put({ id: 'device-2', joinedAt: 1, lastSeenAt: 1 });

    await releaseThisDevice(db);

    expect(await db.cloudDevices.get('device-1')).toBeUndefined();
    expect(await db.cloudDevices.get('device-2')).toBeDefined();
  });

  it('is a no-op when no client identity exists yet', async () => {
    await expect(releaseThisDevice(db)).resolves.toBeUndefined();
  });
});

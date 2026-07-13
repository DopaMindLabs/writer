import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { LoremDB } from '@/db/LoremDB';
import { saveDeviceKeyRing, forgetDeviceKeyRing } from './crypto/keyStore';
import { deriveKeyRing, generateMasterSecret } from './crypto/keys';
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
  await saveDeviceKeyRing(await deriveKeyRing(generateMasterSecret(), 1));
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

  it('re-registering preserves joinedAt and bumps lastSeenAt', async () => {
    await acquireKey();
    withCloud(joinedCloud('device-1'));
    await registerThisDevice(db);

    nowSpy.mockReturnValue(FIXED_TIME + 60_000);
    await registerThisDevice(db);

    const row = await db.cloudDevices.get('device-1');
    expect(row?.joinedAt).toBe(FIXED_TIME);
    expect(row?.lastSeenAt).toBe(FIXED_TIME + 60_000);
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

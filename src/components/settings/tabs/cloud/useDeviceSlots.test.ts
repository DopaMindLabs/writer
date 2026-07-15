import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import Dexie, { type Table } from 'dexie';
import { db } from '@/db/db';
import { deviceLimitState } from '@/lib/cloud/deviceLimit';
import {
  DEVICE_STALE_AFTER_MS,
  type DeviceRecord,
} from '@/lib/cloud/devicePolicy';
import { useDeviceLimitBlocked } from './useDeviceSlots';

/** The slice of `db.cloud` the blocked computation reads. */
interface FakeCloud {
  currentUser: { value: { isLoggedIn: boolean } };
  persistedSyncState: {
    value: { initiallySynced: boolean; clientIdentity?: string };
  };
}

let registryDb: Dexie;

const registry = (): Table<DeviceRecord, string> =>
  registryDb.table<DeviceRecord, string>('cloudDevices');

const withCloud = (clientIdentity?: string): void => {
  const cloud: FakeCloud = {
    currentUser: { value: { isLoggedIn: true } },
    persistedSyncState: { value: { initiallySynced: true, clientIdentity } },
  };
  (db as unknown as { cloud?: FakeCloud }).cloud = cloud;
};

/** Rows seen just now — the ordinary case: every one of them occupies a slot. */
const seedDevices = async (ids: string[]): Promise<void> => {
  const now = Date.now();
  await registry().bulkPut(ids.map((id) => ({ id, joinedAt: now, lastSeenAt: now })));
};

/**
 * Write rows while the hook is mounted. The write is wrapped in `act` because the
 * live query re-emits into React state as a result of it; leaving that emission
 * outside `act` makes React warn and, worse, makes the assertion racy.
 */
const writeRows = async (rows: DeviceRecord[]): Promise<void> => {
  await act(async () => {
    await registry().bulkPut(rows);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

/** A row quiet for longer than the idle window: its slot is reclaimable. */
const staleRow = (id: string): DeviceRecord => ({
  id,
  joinedAt: Date.now() - DEVICE_STALE_AFTER_MS - 2,
  lastSeenAt: Date.now() - DEVICE_STALE_AFTER_MS - 1,
});

const liveRow = (id: string): DeviceRecord => ({
  id,
  joinedAt: Date.now(),
  lastSeenAt: Date.now(),
});

beforeEach(async () => {
  // A real cloudDevices table so the hook's liveQuery observes actual rows (the
  // app db is plain in tests and has no such store).
  registryDb = new Dexie('device-slots-test');
  registryDb.version(1).stores({ cloudDevices: 'id' });
  await registryDb.open();
  (db as { cloudDevices?: Table<DeviceRecord, string> }).cloudDevices = registry();
});

afterEach(async () => {
  deviceLimitState.set(false);
  delete (db as { cloud?: FakeCloud }).cloud;
  delete (db as { cloudDevices?: Table<DeviceRecord, string> }).cloudDevices;
  await registryDb.delete();
});

describe('useDeviceLimitBlocked', () => {
  it('is false while the device is not signed-in-keyless', async () => {
    withCloud('me');
    await seedDevices(['a', 'b']);
    const { result } = renderHook(() => useDeviceLimitBlocked(false, 'unknown'));
    expect(result.current).toBe(false);
  });

  it('blocks a further device once the registry is full', async () => {
    withCloud('me');
    await seedDevices(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    const { result } = renderHook(() => useDeviceLimitBlocked(true, 'present'));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('never blocks a device that is already registered', async () => {
    withCloud('me');
    await seedDevices(['me', 'b']);
    const { result } = renderHook(() => useDeviceLimitBlocked(true, 'present'));
    // Give the liveQuery a tick to resolve; the value must stay false.
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('leaves a free slot open', async () => {
    withCloud('me');
    await seedDevices(['a']);
    const { result } = renderHook(() => useDeviceLimitBlocked(true, 'present'));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('is forced on by the dev/e2e affordance', () => {
    deviceLimitState.set(true);
    const { result } = renderHook(() => useDeviceLimitBlocked(false, 'unknown'));
    expect(result.current).toBe(true);
  });

  it('frees a slot the moment a peer goes stale', async () => {
    // The escape hatch. A keyless device cannot write, so it can neither prune a
    // dead row nor revoke one — if they still counted, four discarded browser
    // profiles would lock every future device out of the account for good.
    withCloud('me');
    await seedDevices(['a', 'b', 'c', 'd']);
    const { result } = renderHook(() => useDeviceLimitBlocked(true, 'present'));
    await waitFor(() => expect(result.current).toBe(true));

    await writeRows([staleRow('d')]);

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('frees a slot the moment a peer is revoked', async () => {
    withCloud('me');
    await seedDevices(['a', 'b', 'c', 'd']);
    const { result } = renderHook(() => useDeviceLimitBlocked(true, 'present'));
    await waitFor(() => expect(result.current).toBe(true));

    await writeRows([{ ...liveRow('d'), revokedAt: Date.now() }]);

    await waitFor(() => expect(result.current).toBe(false));
  });
});

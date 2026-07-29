import { act, renderHook, waitFor } from '@testing-library/react';
import Dexie, { type Table } from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/db';
import { devicePreviewState } from '@/lib/cloud/devicePreview';
import {
  DEVICE_LIMIT,
  DEVICE_STALE_AFTER_MS,
  type DeviceRecord,
} from '@/lib/cloud/devicePolicy';
import { useDeviceList } from './useDeviceList';

interface FakeCloud {
  persistedSyncState: { value: { clientIdentity?: string } };
}

let registryDb: Dexie;

const registry = (): Table<DeviceRecord, string> =>
  registryDb.table<DeviceRecord, string>('cloudDevices');

const now = 1_700_000_000_000;

const liveRow = (
  id: string,
  offset: number,
  extra: Partial<DeviceRecord> = {},
): DeviceRecord => ({
  id,
  joinedAt: now + offset,
  lastSeenAt: now + offset,
  ...extra,
});

const staleRow = (id: string, offset: number): DeviceRecord =>
  liveRow(id, offset, {
    lastSeenAt: now - DEVICE_STALE_AFTER_MS - 1,
  });

const writeRows = async (rows: DeviceRecord[]): Promise<void> => {
  await act(async () => {
    await registry().bulkPut(rows);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const withCloudIdentity = (clientIdentity: string): void => {
  (db as unknown as { cloud?: FakeCloud }).cloud = {
    persistedSyncState: { value: { clientIdentity } },
  };
};

beforeEach(async () => {
  vi.spyOn(Date, 'now').mockReturnValue(now);
  registryDb = new Dexie('device-list-test');
  registryDb.version(1).stores({ cloudDevices: 'id' });
  await registryDb.open();
  (db as { cloudDevices?: Table<DeviceRecord, string> }).cloudDevices = registry();
});

afterEach(async () => {
  vi.restoreAllMocks();
  devicePreviewState.set(null);
  delete (db as unknown as { cloud?: FakeCloud }).cloud;
  delete (db as { cloudDevices?: Table<DeviceRecord, string> }).cloudDevices;
  await registryDb.delete();
});

describe('useDeviceList', () => {
  it('lists visible devices oldest first with slot usage metadata', async () => {
    devicePreviewState.set({ ownId: 'this-device' });
    const { result } = renderHook(() => useDeviceList());

    await writeRows([
      liveRow('newest', 30),
      liveRow('this-device', 10),
      staleRow('stale-peer', 20),
      liveRow('revoked-peer', 0, { revokedAt: now }),
    ]);

    await waitFor(() =>
      expect(result.current).toEqual({
        entries: [
          {
            id: 'this-device',
            joinedAt: now + 10,
            lastSeenAt: now + 10,
            isThisDevice: true,
            isStale: false,
          },
          {
            id: 'stale-peer',
            joinedAt: now + 20,
            lastSeenAt: now - DEVICE_STALE_AFTER_MS - 1,
            isThisDevice: false,
            isStale: true,
          },
          {
            id: 'newest',
            joinedAt: now + 30,
            lastSeenAt: now + 30,
            isThisDevice: false,
            isStale: false,
          },
        ],
        used: 2,
        limit: DEVICE_LIMIT,
      }),
    );
  });

  it('falls back to the cloud client identity when preview is not active', async () => {
    withCloudIdentity('cloud-owned-device');
    await registry().bulkPut([
      liveRow('cloud-owned-device', 0),
      liveRow('other-device', 10),
    ]);

    const { result } = renderHook(() => useDeviceList());

    await waitFor(() =>
      expect(result.current?.entries.map(({ id, isThisDevice }) => ({
        id,
        isThisDevice,
      }))).toEqual([
        { id: 'cloud-owned-device', isThisDevice: true },
        { id: 'other-device', isThisDevice: false },
      ]),
    );
  });
});

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { cloudClientIdentity } from '@/lib/cloud/cloudClient';
import {
  DEVICE_LIMIT,
  isRevokedDevice,
  isStaleDevice,
  liveDevices,
  type DeviceRecord,
} from '@/lib/cloud/devicePolicy';

/** A registry row as the list renders it. */
export interface DeviceListEntry {
  id: string;
  joinedAt: number;
  lastSeenAt: number;
  /** The device the user is looking at right now. */
  isThisDevice: boolean;
  /** Quiet long enough that its slot is already reclaimable. */
  isStale: boolean;
}

export interface DeviceList {
  entries: DeviceListEntry[];
  /** Slots actually occupied, and the cap they count against. */
  used: number;
  limit: number;
}

const toEntry = (
  row: DeviceRecord,
  ownId: string | null,
  now: number,
): DeviceListEntry => ({
  id: row.id,
  joinedAt: row.joinedAt,
  lastSeenAt: row.lastSeenAt,
  isThisDevice: row.id === ownId,
  isStale: isStaleDevice(row, now),
});

/**
 * The account's devices, oldest first, for the settings list.
 *
 * Strictly **read-only**. Writing from here — even a "touch on view" — would put a
 * mutation on a synced table behind a render, which is precisely the shape of the
 * sync loop the registrar was fixed to avoid.
 *
 * Revoked rows are hidden outright: their slot is already free, and showing a
 * device the user has just removed only invites them to remove it again. The
 * tombstone lingers solely so the revoked device itself can learn it was removed.
 */
export const useDeviceList = (): DeviceList | undefined =>
  useLiveQuery<DeviceList | undefined>(async () => {
    const rows = await db.cloudDevices.toArray();
    const now = Date.now();
    const ownId = cloudClientIdentity();
    const visible = rows.filter((row) => !isRevokedDevice(row));
    return {
      entries: visible
        .slice()
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((row) => toEntry(row, ownId, now)),
      used: liveDevices(rows, now).length,
      limit: DEVICE_LIMIT,
    };
  }, []);

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  TrustedDeviceStatus,
  type PrincipalId,
  type TrustedDeviceRecord,
} from 'writer-sync/core';
import { db } from '@/db/db';
import { deviceIdentityStore } from '@/lib/cloud/crypto/deviceIdentityStore';
import { currentPrincipal } from './writerEntityMetadata';
import { createTrustedDeviceStore } from './trustedDeviceStore';

/**
 * The devices this principal has paired with, as the settings list renders them.
 *
 * Revoked records are kept and shown rather than hidden: a device the user
 * removed is a fact about their setup, and a list that silently forgot it
 * would leave them unable to tell "never paired" from "paired and removed".
 *
 * Identity and principal are both resolved *outside* the live query on purpose.
 * `deviceIdentityStore.load()` mints an identity on first use and `getProfile()`
 * creates a profile on first use — both are writes, and Dexie refuses a
 * readwrite transaction inside a live-query callback outright ("Readwrite
 * transaction in liveQuery context"). The query reads the trusted-device table
 * and nothing else.
 */

export interface TrustedDeviceEntry {
  deviceId: string;
  displayName: string;
  addedAt: number;
  /** Absent until an authenticated session has completed. */
  lastSessionAt?: number;
  /** The device the user is looking at right now. */
  isThisDevice: boolean;
  isRevoked: boolean;
}

const toEntry = (record: TrustedDeviceRecord, ownId: string | null): TrustedDeviceEntry => ({
  deviceId: String(record.deviceId),
  displayName: record.displayName,
  addedAt: record.addedAt,
  lastSessionAt: record.lastSessionAt,
  isThisDevice: String(record.deviceId) === ownId,
  isRevoked: record.status === TrustedDeviceStatus.Revoked,
});

/** Identity and principal together: both need a write, so both resolve up front. */
interface DeviceOwner {
  principalId: PrincipalId;
  deviceId: string;
}

const loadOwner = async (): Promise<DeviceOwner> => ({
  principalId: await currentPrincipal(),
  deviceId: String((await deviceIdentityStore.load()).deviceId),
});

/** `undefined` while the first read is in flight, so callers can show nothing yet. */
export const useTrustedDevices = (): TrustedDeviceEntry[] | undefined => {
  const [owner, setOwner] = useState<DeviceOwner | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadOwner().then((resolved) => {
      if (!cancelled) setOwner(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const records = useLiveQuery(
    () =>
      owner === null
        ? Promise.resolve<TrustedDeviceRecord[]>([])
        : createTrustedDeviceStore(db).list(owner.principalId),
    [owner],
  );

  if (owner === null || records === undefined) return undefined;
  return records
    .map((record) => toEntry(record, owner.deviceId))
    .sort((a, b) => a.addedAt - b.addedAt);
};

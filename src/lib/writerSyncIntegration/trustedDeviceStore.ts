import type { LoremDB } from '@/db/LoremDB';
import { invariant } from '@/lib/invariant';
import {
  TrustedDeviceStatus,
  type DeviceId,
  type TrustedDeviceRecord,
  type TrustedDeviceRegistry,
} from 'writer-sync/core';

/**
 * Writer's {@link TrustedDeviceRegistry}, backed by its own `trustedDevices`
 * table.
 *
 * Deliberately *not* `cloudDevices`: that table is the Dexie Cloud addon's
 * courtesy registry of sessions, owned and rewritten by the provider. Trust has
 * to survive the provider being disabled, and must not be something a provider
 * can edit — so it lives in a table the application owns.
 *
 * Every mutation reads and writes inside one transaction: two pairing sessions
 * completing at once would otherwise read the same record, and the second write
 * would silently discard the first's acknowledgement state.
 */
export const createTrustedDeviceStore = (db: LoremDB): TrustedDeviceRegistry => {
  const mutate = async (
    deviceId: DeviceId,
    change: (record: TrustedDeviceRecord) => TrustedDeviceRecord,
  ): Promise<void> => {
    await db.transaction('rw', db.trustedDevices, async () => {
      const existing = await db.trustedDevices.get(String(deviceId));
      // A missing device is not an error: a peer may have been removed between
      // authenticating and finishing its round. Creating one here would forge
      // trust that no pairing established.
      if (!existing) return;
      await db.trustedDevices.put(change(existing));
    });
  };

  return {
    list: (principalId) =>
      db.trustedDevices.where('principalId').equals(String(principalId)).toArray(),

    find: async (deviceId) => (await db.trustedDevices.get(String(deviceId))) ?? null,

    trust: async (record) => {
      await db.transaction('rw', db.trustedDevices, async () => {
        const existing = await db.trustedDevices.get(String(record.deviceId));
        invariant(
          !existing,
          'trusted devices: this device is already known — re-pairing opens a session, it does not replace the identity',
        );
        await db.trustedDevices.put(record);
      });
    },

    recordSession: ({ deviceId, at }) =>
      mutate(deviceId, (record) => ({ ...record, lastSessionAt: at })),

    revoke: ({ deviceId, at }) =>
      mutate(deviceId, (record) => ({
        ...record,
        status: TrustedDeviceStatus.Revoked,
        revokedAt: at,
      })),

    acknowledge: ({ deviceId, accessScopeId, operationId }) =>
      mutate(deviceId, (record) => ({
        ...record,
        acknowledgedOperations: {
          ...record.acknowledgedOperations,
          [accessScopeId]: operationId,
        },
      })),
  };
};

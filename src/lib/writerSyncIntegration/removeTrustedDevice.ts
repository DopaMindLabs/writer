import { TrustedDeviceStatus, type DeviceId } from 'writer-sync/core';
import { releasableTombstones } from 'writer-sync/operations';
import type { LoremDB } from '@/db/LoremDB';
import { currentPrincipal } from '@/lib/writerSyncIntegration/writerEntityMetadata';
import { createTrustedDeviceStore } from './trustedDeviceStore';

/**
 * Remove a device, and let go of what was only being kept for it.
 *
 * Removal is the one release valve deletion state has. A tombstone and its
 * signed delete frame are held until every trusted device has confirmed the
 * deletion, with no time backstop — a device that never returns would otherwise
 * pin them forever, and that device is exactly the one a user removes.
 *
 * Doing it here rather than in the routine compaction pass is the difference
 * between "there is nobody to wait for right now" and "there is nobody to wait
 * for". A device between pairings has not finished with them, and a peer paired
 * tomorrow could still be holding what was deleted today; a device the user has
 * removed is a relationship they have ended.
 *
 * The removal and the release are one transaction across all three tables. They
 * are two halves of one fact — that this device is no longer waited on — and
 * committing the first without the second would leave the deletion state pinned
 * by a device that no longer exists to release it, with nothing left that would
 * ever look again.
 */
export const removeTrustedDevice = async (options: {
  db: LoremDB;
  deviceId: DeviceId;
  at?: number;
}): Promise<void> => {
  const { db, deviceId } = options;
  const at = options.at ?? Date.now();
  const registry = createTrustedDeviceStore(db);
  // Read before the transaction opens: the principal is not this transaction's
  // to wait on, and the registry's own writes join it from inside.
  const principalId = await currentPrincipal();

  await db.transaction(
    'rw',
    [db.trustedDevices, db.syncOperations, db.syncTombstones],
    async () => {
      await registry.revoke({ deviceId, at });

      const remaining = (await registry.list(principalId))
        .filter((record) => record.status === TrustedDeviceStatus.Active)
        .map(({ deviceId: id, acknowledgedOperations }) => ({
          deviceId: id,
          acknowledgedOperations,
        }));

      const releasable = releasableTombstones(
        await db.syncTombstones.toArray(),
        remaining,
        // Nobody left to wait for, and nobody coming back: whatever was being
        // held for the device just removed is now held for no one.
        { withoutPeersIsUnanimous: true },
      );
      if (releasable.length === 0) return;
      await db.syncTombstones.bulkDelete(
        releasable.map((tombstone) => [tombstone.entityTable, tombstone.entityId]),
      );
      await db.syncOperations.bulkDelete(
        releasable.map((tombstone) => String(tombstone.operationId)),
      );
    },
  );
};

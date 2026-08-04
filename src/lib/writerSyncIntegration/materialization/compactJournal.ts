import {
  compactableOperationIds,
  releasableTombstones,
  type PeerAcknowledgement,
} from 'writer-sync/operations';
import { TrustedDeviceStatus } from 'writer-sync/core';
import type { LoremDB } from '@/db/LoremDB';
import { getJournalRetentionDays } from '@/lib/writerSyncIntegration/journalRetentionPreference';
import { currentPrincipal } from '@/lib/writerSyncIntegration/writerEntityMetadata';

/**
 * Compact the operation journal: drop the frames every trusted peer already
 * holds, plus those that have aged out of the retention window, and retire the
 * tombstones every trusted peer has acknowledged.
 *
 * Runs at sync boot rather than on a timer: the journal only grows while sync is
 * running, and a device that never starts sync has nothing new to compact. The
 * inbox rows for compacted operations stay — they are the receipt that an
 * operation was already applied, and dropping them would let an aged frame
 * arriving from a slow peer replay as new.
 */

/**
 * The peers whose acknowledgement is still awaited. Only **active** records
 * count: a revoked device is no longer synchronised with, so waiting on it would
 * pin the journal and every tombstone forever on a device that will never answer.
 */
const activePeers = async (db: LoremDB): Promise<PeerAcknowledgement[]> => {
  const principalId = await currentPrincipal();
  const records = await db.trustedDevices
    .where('principalId')
    .equals(String(principalId))
    .toArray();
  return records
    .filter((record) => record.status === TrustedDeviceStatus.Active)
    .map(({ deviceId, acknowledgedOperations }) => ({ deviceId, acknowledgedOperations }));
};

export interface JournalCompaction {
  /** Frames dropped from the journal. */
  operations: number;
  /** Tombstones retired. */
  tombstones: number;
}

export const compactJournal = async (
  db: LoremDB,
  now: () => number = () => Date.now(),
): Promise<JournalCompaction> => {
  const retentionDays = await getJournalRetentionDays();
  const peers = await activePeers(db);
  const retention = { retentionDays, now: now() };

  // Tombstones go first, and what survives them decides what the journal may
  // drop: a delete frame is released by its tombstone, never by the window.
  const tombstones = await db.syncTombstones.toArray();
  const releasable = releasableTombstones(tombstones, peers);
  if (releasable.length > 0) {
    await db.syncTombstones.bulkDelete(
      releasable.map((tombstone) => [tombstone.entityTable, tombstone.entityId]),
    );
  }
  const released = new Set(releasable.map((tombstone) => String(tombstone.operationId)));

  const frames = await db.syncOperations.toArray();
  const compactable = compactableOperationIds(frames, {
    retention,
    peers,
    tombstones: tombstones.filter(
      (tombstone) => !released.has(String(tombstone.operationId)),
    ),
  });
  if (compactable.length > 0) {
    await db.syncOperations.bulkDelete(compactable.map((id) => String(id)));
  }

  return { operations: compactable.length, tombstones: releasable.length };
};

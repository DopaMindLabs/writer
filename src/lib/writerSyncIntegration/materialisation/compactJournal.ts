import {
  compactableOperationIds,
  releasableTombstones,
  type PeerAcknowledgement,
  type SyncTombstone,
} from 'writer-sync/operations';
import { TrustedDeviceStatus, type OperationId } from 'writer-sync/core';
import type { LoremDB } from '@/db/LoremDB';
import { getJournalRetentionDays } from '@/lib/writerSyncIntegration/journalRetentionPreference';
import { currentPrincipal } from '@/lib/writerSyncIntegration/writerEntityMetadata';
import { readableFrames } from './frameAdmission';
import { owedWithdrawals } from './owedWithdrawals';
import {
  holdAgainstWindow,
  keepPendingHistory,
  releaseDeletions,
  vouchForSettledHistory,
} from './releaseDeletions';

/**
 * Compact the operation journal: drop the frames every trusted peer already
 * holds, plus those that have aged out of the retention window, and retire the
 * tombstones every trusted peer has acknowledged. A scope move's withdrawal has
 * no tombstone to hold it, so it is never aged out: only every peer holding it
 * lets it go.
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

/** Drop the deletions that are finished with, and the frames they named. */
const releasePairs = async (options: {
  db: LoremDB;
  tombstones: readonly SyncTombstone[];
  releasable: readonly SyncTombstone[];
  compactable: readonly OperationId[];
}): Promise<JournalCompaction> => {
  const { db, tombstones, releasable, compactable } = options;
  if (releasable.length === 0 && compactable.length === 0) {
    return { operations: 0, tombstones: 0 };
  }
  // Every deletion's history, not only the releasable ones': the window may be
  // about to take some of what a standing deletion has not settled yet.
  const vouched = await vouchForSettledHistory(db, tombstones);
  const tables = [db.syncOperations, db.syncTombstones, db.syncInbox, db.syncPendingHistory];
  return db.transaction('rw', tables, async () => {
    // Before any frame goes: the verdicts are read from what is still retained.
    const retired = await releaseDeletions(db, releasable, vouched);
    // Every deletion still standing keeps its frame, whatever the window says —
    // one its history holds, one still waited on, one ingestion wrote meanwhile —
    // and the history it has not settled that may yet be admitted.
    const held = await holdAgainstWindow(db, vouched, new Set(compactable.map(String)));
    const dropped = compactable.map(String).filter((id) => !held.has(id));
    await db.syncOperations.bulkDelete(dropped);
    await keepPendingHistory(db, vouched);
    return { operations: dropped.length, tombstones: retired.length };
  });
};

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
  const released = new Set(releasable.map((tombstone) => String(tombstone.operationId)));

  // Only a row that decodes has an age and an order to judge. One that does not
  // can never be admitted; it stays as inert as ingestion leaves it, since this
  // device cannot tell what it was and dropping it would replicate the loss.
  const frames = readableFrames(await db.syncOperations.toArray());
  const withdrawals = await owedWithdrawals({ db, frames, tombstones });
  const compactable = compactableOperationIds(frames, {
    retention,
    peers,
    tombstones: tombstones.filter(
      (tombstone) => !released.has(String(tombstone.operationId)),
    ),
    keptUntilHeld: withdrawals.map(({ operationId }) => operationId),
  });

  // One transaction for both halves: a tombstone released without its frame
  // leaves a deletion no rebuild can serve, and a frame dropped without its
  // tombstone leaves one nothing refuses.
  return releasePairs({ db, tombstones, releasable, compactable });
};

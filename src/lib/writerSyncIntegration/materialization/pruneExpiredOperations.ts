import { expiredOperationIds } from 'writer-sync/operations';
import type { LoremDB } from '@/db/LoremDB';
import { getJournalRetentionDays } from '@/lib/writerSyncIntegration/journalRetentionPreference';

/**
 * Drop journalled operations that have aged out of the retention window.
 *
 * Runs at sync boot rather than on a timer: the journal only grows while sync is
 * running, and a device that never starts sync has nothing new to prune. The
 * inbox rows for pruned operations stay — they are the receipt that an operation
 * was already applied, and dropping them would let an aged frame arriving from a
 * slow peer replay as new.
 *
 * Tombstones are exempt by design (see the package policy): they must outlive
 * the frames that produced them or a long-absent device could resurrect a
 * deleted entity.
 */
export const pruneExpiredOperations = async (
  db: LoremDB,
  now: () => number = () => Date.now(),
): Promise<number> => {
  const retentionDays = await getJournalRetentionDays();
  const frames = await db.syncOperations.toArray();
  const expired = expiredOperationIds(frames, { retentionDays, now: now() });
  if (expired.length > 0) {
    await db.syncOperations.bulkDelete(expired.map((operationId) => String(operationId)));
  }
  return expired.length;
};

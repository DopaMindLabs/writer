import type { LoremDB } from '@/db/LoremDB';
import type { SeenOperation, SyncInboxEntry } from 'writer-sync/operations';

/**
 * Everything this device has seen, per scope and origin — the catch-up
 * manifest's source.
 *
 * The union of two records, deduplicated by operation id:
 *
 * - the retained journal, which also covers frames journalled but not yet
 *   swept into the inbox;
 * - the inbox, which is never pruned and so still names every operation whose
 *   frame compaction has dropped.
 *
 * Built from the journal alone, the manifest shrank with compaction: an origin
 * whose frames every peer held vanished, the peer read the silence as "never
 * seen" and re-authored the whole scope as fresh frames — every session,
 * for ever. What a device has seen only grows, so two converged devices
 * advertise identical manifests and the exchange finally goes quiet.
 */

/**
 * An inbox row as persisted storage returns it. Rows written before the inbox
 * carried ordering fields lack them, so the fields are optional at this read
 * boundary even though the type requires them at every write.
 */
type StoredInboxEntry = Omit<SyncInboxEntry, 'deviceId' | 'logicalAt'> &
  Partial<Pick<SyncInboxEntry, 'deviceId' | 'logicalAt'>>;

const asSeen = (entry: StoredInboxEntry): SeenOperation | null => {
  // A row that cannot order its operation describes nothing the manifest can
  // carry. While its frame survives in the journal the union above still names
  // the operation; once compacted it is simply no longer advertised.
  if (entry.deviceId === undefined || entry.logicalAt === undefined) return null;
  return {
    accessScopeId: entry.accessScopeId,
    deviceId: entry.deviceId,
    operationId: entry.operationId,
    logicalAt: entry.logicalAt,
  };
};

export const seenOperations = async (db: LoremDB): Promise<SeenOperation[]> => {
  const [frames, entries] = await Promise.all([
    db.syncOperations.toArray(),
    db.syncInbox.toArray() as Promise<StoredInboxEntry[]>,
  ]);
  const seen = new Map<string, SeenOperation>();
  for (const frame of frames) {
    seen.set(String(frame.operationId), {
      accessScopeId: frame.accessScopeId,
      deviceId: frame.deviceId,
      operationId: frame.operationId,
      logicalAt: frame.logicalAt,
    });
  }
  for (const entry of entries) {
    const ordered = asSeen(entry);
    if (ordered !== null) seen.set(String(entry.operationId), ordered);
  }
  return [...seen.values()];
};

import { invariant } from '@/lib/invariant';
import type { EncryptedSyncFrame, SyncInboxEntry } from 'writer-sync/operations';
import { requireJournalledTable } from './frameAdmission';
import {
  prepareScopeRebinding, requireReadableSource, requireScopeMoveKeys,
} from './prepareScopeRebinding';
import { admitRebindingSnapshot } from './scopeRebindingAdmission';
import {
  readRebindingSnapshot, scopeEntityKey, scopeRebindingTables,
} from './scopeRebindingSnapshot';
import { tombstoneOf } from './tombstone';
import type {
  PreparedScopeEntity, RebindingSnapshot, ScopeRebindingOptions, ScopeRebindingReceipt, ScopeTransition,
} from './scopeRebinding.types';

/** The prepared move no longer describes this device's accepted state. */
export class ScopeRebindingChangedError extends Error {
  constructor() {
    super('The saved state changed during scope rebinding; prepare a fresh snapshot');
    this.name = 'ScopeRebindingChangedError';
  }
}

/** The inbox entry recording what this device did with an operation. */
const receiptOf = (
  frame: EncryptedSyncFrame,
  result: SyncInboxEntry['result'],
): SyncInboxEntry => ({
  operationId: frame.operationId, accessScopeId: frame.accessScopeId,
  deviceId: frame.deviceId, logicalAt: frame.logicalAt,
  entityTable: frame.entityTable, entityId: frame.entityId,
  result, receivedAt: frame.logicalAt.millis,
});

/** The frames the move authored for one entity, in the order they take effect. */
const authoredFrames = ({ withdrawal, frame }: PreparedScopeEntity): EncryptedSyncFrame[] =>
  withdrawal ? [withdrawal, frame] : [frame];

const commitEntity = async (options: {
  move: ScopeTransition;
  prepared: PreparedScopeEntity;
}): Promise<void> => {
  const { move: { db }, prepared: { frame, withdrawal, row, chunks } } = options;
  const table = requireJournalledTable(db, frame.entityTable);
  if (row) {
    await table.put(row);
    await db.syncTombstones.delete([frame.entityTable, frame.entityId]);
  } else {
    await table.delete(frame.entityId);
    await db.syncTombstones.put(tombstoneOf(frame));
  }
  if (chunks.length > 0) {
    // Shrinking an attachment can leave extra old indices. None may retain the
    // source binding when the current ciphertext moves to another scope.
    await db.syncAttachmentChunks.where('attachmentId').equals(frame.entityId).delete();
    await db.syncAttachmentChunks.bulkPut(chunks);
  }
  // The withdrawal is overtaken here by the put that follows it.
  await db.syncInbox.bulkAdd([
    ...(withdrawal ? [receiptOf(withdrawal, 'superseded')] : []),
    receiptOf(frame, 'applied'),
  ]);
};

/**
 * Receipts for the retained history of every moved entity. Admission verified
 * each of these frames and the fresh operation supersedes them all. Without a
 * receipt, one this device authored reads as unapplied once the move's own
 * frame is compacted, and the next sweep would put the row back in its old scope.
 */
const settledHistory = (
  snapshot: RebindingSnapshot,
  prepared: readonly PreparedScopeEntity[],
): SyncInboxEntry[] => {
  const accepted = new Set(snapshot.inbox.map((entry) => String(entry.operationId)));
  const deletedBy = new Map(prepared.map(({ frame, row }) => [scopeEntityKey(frame), row === null]));
  return snapshot.history.flatMap((frame): SyncInboxEntry[] => {
    const deleted = deletedBy.get(scopeEntityKey(frame));
    if (deleted === undefined || accepted.has(String(frame.operationId))) return [];
    return [receiptOf(frame, deleted && frame.kind === 'put' ? 'tombstoned' : 'superseded')];
  });
};

const commitRebinding = async (options: {
  move: ScopeTransition;
  snapshot: RebindingSnapshot;
  prepared: readonly PreparedScopeEntity[];
}): Promise<void> => {
  const { move, snapshot, prepared } = options;
  const { db, requestId, scopes } = move;
  await db.transaction('rw', scopeRebindingTables(db), async () => {
    const current = await readRebindingSnapshot(move);
    if (JSON.stringify(current) !== JSON.stringify(snapshot)) throw new ScopeRebindingChangedError();
    // Including syncInbox marks this as an explicit materialisation transaction:
    // the middleware must not journal the already prepared mutations a second time.
    for (const entity of prepared) await commitEntity({ move, prepared: entity });
    await db.syncInbox.bulkAdd(settledHistory(snapshot, prepared));
    const authored = prepared.flatMap(authoredFrames);
    await db.syncOperations.bulkAdd(authored);
    await db.syncScopeRebindings.bulkAdd([{
      requestId, sourceScopeId: scopes.from, destinationScopeId: scopes.to,
      operationIds: authored.map(({ operationId }) => operationId),
    }]);
  });
};

const completedRequest = (
  move: ScopeTransition,
  receipt: ScopeRebindingReceipt | undefined,
): boolean => {
  if (!receipt) return false;
  invariant(receipt.sourceScopeId === move.scopes.from && receipt.destinationScopeId === move.scopes.to,
    'Scope move request id was already used for different scopes');
  return true;
};

/**
 * Move this device's current rows and retained deletions to another access scope.
 * History may be incomplete after compaction; it must never supply the content.
 * A current row gets a signed deletion in the source followed by a fresh signed
 * put in the destination; a retained deletion gets one fresh signed deletion in
 * the destination. Both commit with the local state. Original frames remain
 * immutable. An explicit request id makes retries durable, including empty
 * moves; a deliberate later move must use a different request id. Concurrent
 * state, journal or trust changes abort the whole prepared batch.
 */
export const rescopeFrames = async (options: ScopeRebindingOptions): Promise<number> => {
  const { db, scopes, requestId } = options;
  invariant(requestId.trim().length > 0, 'Scope move requires a non-empty request id');
  if (completedRequest(options, await db.syncScopeRebindings.get(requestId))) return 0;
  if (scopes.from === scopes.to) return 0;
  requireScopeMoveKeys(options);
  const snapshot = await db.transaction('r', scopeRebindingTables(db),
    () => readRebindingSnapshot(options));
  if (completedRequest(options, snapshot.receipt)) return 0;
  requireReadableSource(snapshot);
  await admitRebindingSnapshot({ db, snapshot });
  const states = snapshot.entities.filter((state) =>
    (state.row?.accessScopeId ?? state.tombstone?.accessScopeId) === scopes.from);
  const prepared = await prepareScopeRebinding({ move: options, states });
  await commitRebinding({ move: options, snapshot, prepared });
  return prepared.length;
};

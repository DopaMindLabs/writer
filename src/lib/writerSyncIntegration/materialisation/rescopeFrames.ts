import { invariant } from '@/lib/invariant';
import { requireJournalledTable } from './frameAdmission';
import { prepareScopeRebinding, requireScopeMoveKeys } from './prepareScopeRebinding';
import { admitRebindingSnapshot } from './scopeRebindingAdmission';
import { readRebindingSnapshot, scopeRebindingTables } from './scopeRebindingSnapshot';
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

const commitEntity = async (options: {
  move: ScopeTransition;
  prepared: PreparedScopeEntity;
}): Promise<void> => {
  const { move: { db }, prepared: { frame, row, chunks } } = options;
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
  await db.syncInbox.add({
    operationId: frame.operationId, accessScopeId: frame.accessScopeId,
    deviceId: frame.deviceId, logicalAt: frame.logicalAt,
    entityTable: frame.entityTable, entityId: frame.entityId,
    result: 'applied', receivedAt: frame.logicalAt.millis,
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
    await db.syncOperations.bulkAdd(prepared.map(({ frame }) => frame));
    await db.syncScopeRebindings.bulkAdd([{
      requestId, sourceScopeId: scopes.from, destinationScopeId: scopes.to,
      operationIds: prepared.map(({ frame }) => frame.operationId),
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
 * Each entity gets one fresh signed operation, committed with its local state.
 * Original frames remain immutable. An explicit request id makes retries durable,
 * including empty moves; a deliberate later move must use a different request id.
 * Concurrent state, journal or trust changes abort the whole prepared batch.
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
  await admitRebindingSnapshot({ db, snapshot });
  const states = snapshot.entities.filter((state) =>
    (state.row?.accessScopeId ?? state.tombstone?.accessScopeId) === scopes.from);
  const prepared = await prepareScopeRebinding({ move: options, states });
  await commitRebinding({ move: options, snapshot, prepared });
  return prepared.length;
};

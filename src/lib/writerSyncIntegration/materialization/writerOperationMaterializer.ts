import type { LoremDB } from '@/db/LoremDB';
import type { SyncKeyRing } from 'writer-sync/crypto';
import { openOperationPayload } from 'writer-sync/crypto';
import { compareOperations, supersedes } from 'writer-sync/operations';
import { verifyFrame } from 'writer-sync/operations';
import type { MaterializeResult } from 'writer-sync/operations';
import type {
  EncryptedSyncFrame,
  SyncTombstone,
} from 'writer-sync/operations';

/**
 * Applies inbound operation frames to Writer's local state. The invariants the
 * runbook demands live here:
 *
 * - an accepted operation id replays as a no-op (the inbox is checked and
 *   written in the same transaction as materialisation);
 * - entity conflicts resolve deterministically (hybrid logical time, then
 *   device id — never provider arrival order);
 * - deletes create tombstones, and a stale put can never resurrect a
 *   tombstoned entity;
 * - applying an inbound operation never emits a new local operation (writes go
 *   straight to the table; only the explicit factory journalises);
 * - the frame stored in the journal is the immutable ciphertext as received.
 */

const journalWinner = async (
  db: LoremDB,
  frame: EncryptedSyncFrame,
): Promise<EncryptedSyncFrame | undefined> => {
  const rivals = await db.syncOperations
    .where('[entityTable+entityId]')
    .equals([frame.entityTable, frame.entityId])
    .toArray();
  return rivals.sort(compareOperations).at(-1);
};

const applyDelete = async (
  db: LoremDB,
  frame: EncryptedSyncFrame,
): Promise<MaterializeResult> => {
  const tombstone: SyncTombstone = {
    entityId: frame.entityId,
    entityTable: frame.entityTable,
    accessScopeId: frame.accessScopeId,
    operationId: frame.operationId,
    deviceId: frame.deviceId,
    logicalAt: frame.logicalAt,
    acknowledgedBy: [],
  };
  await db.syncTombstones.put(tombstone);
  await db.table(frame.entityTable).delete(frame.entityId);
  return 'applied';
};

const applyPut = async (
  db: LoremDB,
  frame: EncryptedSyncFrame,
  row: Record<string, unknown>,
): Promise<MaterializeResult> => {
  const tombstone = await db.syncTombstones.get([frame.entityTable, frame.entityId]);
  if (tombstone && !supersedes(frame, { ...frame, ...tombstone })) {
    // The deletion is later (or ties) — the put is stale and must not
    // resurrect the entity.
    return 'tombstoned';
  }
  const winner = await journalWinner(db, frame);
  if (winner && compareOperations(winner, frame) > 0 && winner.kind === 'put') {
    // A strictly later put is already journalled locally; this one lost.
    return 'superseded';
  }
  if (tombstone) {
    await db.syncTombstones.delete([frame.entityTable, frame.entityId]);
  }
  await db.table(frame.entityTable).put(row);
  return 'applied';
};

/**
 * Verify, journal, and materialise one inbound frame. Idempotent: an already
 * accepted operation id returns its recorded result without touching state.
 * The payload is decrypted before the transaction opens (Web Crypto must not
 * suspend a live IndexedDB transaction); everything stateful commits atomically.
 */
export const applyInboundFrame = async (options: {
  db: LoremDB;
  frame: unknown;
  ring: SyncKeyRing;
}): Promise<MaterializeResult> => {
  const { db, ring } = options;
  const frame = await verifyFrame(options.frame);
  const row =
    frame.kind === 'put' ? await openOperationPayload(ring, frame, frame.payload) : null;

  return db.transaction(
    'rw',
    [
      db.table(frame.entityTable),
      db.syncOperations,
      db.syncInbox,
      db.syncTombstones,
    ],
    async () => {
      const prior = await db.syncInbox.get(String(frame.operationId));
      if (prior) return prior.result;
      // The received ciphertext is journalled verbatim — immutable, never
      // re-encrypted — so this device can serve it onward to other providers.
      await db.syncOperations.put(frame);
      const result =
        frame.kind === 'delete'
          ? await applyDelete(db, frame)
          : await applyPut(db, frame, row ?? {});
      await db.syncInbox.put({
        operationId: frame.operationId,
        accessScopeId: frame.accessScopeId,
        entityTable: frame.entityTable,
        entityId: frame.entityId,
        result,
        receivedAt: frame.logicalAt.millis,
      });
      return result;
    },
  );
};

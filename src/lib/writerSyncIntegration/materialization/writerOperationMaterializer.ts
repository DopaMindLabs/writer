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
import { writerClock } from '@/lib/writerSyncIntegration/writerLogicalClock';

/**
 * Applies inbound operation frames to Writer's local state. The invariants the
 * runbook demands live here:
 *
 * - an accepted operation id replays as a no-op (the inbox is checked and
 *   written in the same transaction as materialisation);
 * - entity conflicts resolve deterministically (hybrid logical time, then
 *   device id — never provider arrival order), for deletions as much as puts;
 * - deletes create tombstones, and a stale put can never resurrect a
 *   tombstoned entity;
 * - the logical time of an accepted operation merges into this device's clock,
 *   so local edits are stamped after everything the device has seen;
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
  const winner = await journalWinner(db, frame);
  if (winner && compareOperations(winner, frame) > 0 && winner.kind === 'put') {
    // A strictly later put is already journalled locally; this deletion lost.
    // Removing the row here would let provider arrival order discard newer
    // content — the same rule `applyPut` applies in the other direction.
    return 'superseded';
  }
  const tombstone: SyncTombstone = {
    entityId: frame.entityId,
    entityTable: frame.entityTable,
    accessScopeId: frame.accessScopeId,
    operationId: frame.operationId,
    deviceId: frame.deviceId,
    logicalAt: frame.logicalAt,
    acknowledgedBy: [],
  };
  const recorded = await db.syncTombstones.get([frame.entityTable, frame.entityId]);
  // Keep the latest deletion: an older delete arriving afterwards must not
  // rewrite the tombstone a later put is compared against.
  if (!recorded || supersedes(frame, { ...frame, ...recorded })) {
    await db.syncTombstones.put(tombstone);
  }
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

  const result = await db.transaction(
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
  // The frame's logical time joins this device's clock, so the next local edit
  // is stamped after every operation this device has accepted — a device whose
  // wall clock lags would otherwise keep losing conflicts it should win.
  writerClock.observe(frame.logicalAt);
  return result;
};

import type { Table } from 'dexie';
import type { LoremDB } from '@/db/LoremDB';
import { canonicalJson } from 'writer-sync/crypto';
import {
  compareOperations,
  verifyFrame,
  type EncryptedSyncFrame,
  type SyncInboxEntry,
  type SyncTombstone,
} from 'writer-sync/operations';
import { admittedFrame, readableFrames, requireJournalledTable } from './frameAdmission';
import { createWriterFrameVerifier, type WriterFrameVerifier } from './writerFrameVerifier';

/** What a release may rely on, read before its transaction opens. */
export interface VouchedHistory {
  /** Retained frames admission accepted, by operation id. */
  readonly admitted: ReadonlyMap<string, EncryptedSyncFrame>;
  /** Retained frames that can never be admitted, by operation id. */
  readonly inadmissible: ReadonlyMap<string, EncryptedSyncFrame>;
  /** Retained frames that may yet be admitted, by operation id. */
  readonly pending: ReadonlyMap<string, EncryptedSyncFrame>;
}

/**
 * The verdict a released deletion settled for one retained operation of its
 * entity: the deletion itself took effect, an older put could not resurrect
 * what it deleted, and an older deletion was overtaken by it.
 */
const verdictOf = (
  frame: EncryptedSyncFrame,
  deletion: SyncTombstone,
): SyncInboxEntry['result'] => {
  if (String(frame.operationId) === String(deletion.operationId)) return 'applied';
  return frame.kind === 'put' ? 'tombstoned' : 'superseded';
};

/** Where two rows name the same entity. */
const entityKey = (row: { entityTable: string; entityId: string }): string =>
  JSON.stringify([row.entityTable, row.entityId]);

/**
 * The operations in `table` the deletion settles that the inbox has not
 * recorded, decoded before anything reads their order. A row that does not
 * decode is inert and left out: it neither holds the deletion nor earns a receipt.
 */
const unsettledIn = async (options: {
  db: LoremDB;
  table: Table<EncryptedSyncFrame, string>;
  deletion: SyncTombstone;
}): Promise<EncryptedSyncFrame[]> => {
  const { db, table, deletion } = options;
  const history = readableFrames(await table
    .where('[entityTable+entityId]')
    .equals([deletion.entityTable, deletion.entityId])
    .toArray());
  const settled = history.filter((frame) => compareOperations(frame, deletion) <= 0);
  const recorded = await db.syncInbox.bulkGet(
    settled.map((frame) => String(frame.operationId)),
  );
  return settled.filter((_frame, index) => recorded[index] === undefined);
};

/** The retained operations the deletion settles that the inbox has not recorded. */
const unsettledBy = (db: LoremDB, deletion: SyncTombstone): Promise<EncryptedSyncFrame[]> =>
  unsettledIn({ db, table: db.syncOperations, deletion });

/**
 * Whether a frame that failed admission never can pass it. Its structure,
 * payload hash and table do not depend on whom this device trusts or what time
 * it is, and nor does a signature its author's known key refuses. A frame
 * refused only because its author has no key here yet, or for its clock, may
 * pass later, when an identity row arrives or the clock catches up.
 */
const neverAdmissible = async (
  db: LoremDB,
  candidate: EncryptedSyncFrame,
  verifier: WriterFrameVerifier,
): Promise<boolean> => {
  let frame: EncryptedSyncFrame;
  try {
    frame = await verifyFrame(candidate);
    requireJournalledTable(db, frame.entityTable);
  } catch {
    // Malformed, altered or aimed at a table peers do not own: no key or clock fixes that.
    return true;
  }
  try {
    return (await verifier.verdict(frame)) === 'refused';
  } catch {
    // Trust could not be read: nothing says it never will verify, so it may yet.
    return false;
  }
};

/**
 * Verify the history the deletions would settle, before any transaction opens:
 * signatures are Web Crypto, which must not suspend an IndexedDB transaction.
 * A receipt tells ingestion an operation id is finished with, so only a frame
 * that passes the admission materialisation applies — structure and payload
 * hash, table policy, a trusted signature — may earn one. A frame that never can
 * stays as inert as ingestion leaves it; one that may yet pass holds its deletion.
 */
export const vouchForSettledHistory = async (
  db: LoremDB,
  deletions: readonly SyncTombstone[],
): Promise<VouchedHistory> => {
  const verifySignature = createWriterFrameVerifier(db);
  const admitted = new Map<string, EncryptedSyncFrame>();
  const inadmissible = new Map<string, EncryptedSyncFrame>();
  const pending = new Map<string, EncryptedSyncFrame>();
  for (const deletion of deletions) {
    const journalled = await unsettledBy(db, deletion);
    // Copies kept of pending history the journal no longer holds as it was: lost
    // since, or replaced under the same id by a row a provider wrote, which must
    // not shadow the copy. Vouched for after the journal, so a copy stands in
    // for its id where both would land in one verdict.
    const asJournalled = new Set(journalled.map((frame) => canonicalJson(frame)));
    const kept = (await unsettledIn({ db, table: db.syncPendingHistory, deletion }))
      .filter((frame) => !asJournalled.has(canonicalJson(frame)));
    for (const candidate of [...journalled, ...kept]) {
      const id = String(candidate.operationId);
      const frame = await admittedFrame({ db, candidate, verifySignature });
      if (frame) admitted.set(id, frame);
      else if (await neverAdmissible(db, candidate, verifySignature)) inadmissible.set(id, candidate);
      else pending.set(id, candidate);
    }
  }
  return { admitted, inadmissible, pending };
};

/** The inbox entry recording what a released deletion settled for one operation. */
const receiptOf = (frame: EncryptedSyncFrame, deletion: SyncTombstone): SyncInboxEntry => ({
  operationId: frame.operationId,
  accessScopeId: frame.accessScopeId,
  deviceId: frame.deviceId,
  logicalAt: frame.logicalAt,
  entityTable: frame.entityTable,
  entityId: frame.entityId,
  result: verdictOf(frame, deletion),
  receivedAt: frame.logicalAt.millis,
});

/**
 * Whether the retained row is still, field for field, the frame vouched for.
 * A signature alone does not say so: a provider can copy one onto altered
 * content, and the copy is not what was verified.
 */
const stillVouched = (
  vouched: EncryptedSyncFrame | undefined,
  retained: EncryptedSyncFrame,
): vouched is EncryptedSyncFrame =>
  vouched !== undefined && canonicalJson(retained) === canonicalJson(vouched);

/**
 * History `vouched` for as settled by the deletion that the journal no longer
 * holds as it was, with no verdict recorded: a compaction replicated from
 * another device can drop a frame between the vouching and the release, a
 * provider can put another row under its id, and a peer that still holds the
 * frame can replay it later.
 */
const vanishedSince = async (options: {
  db: LoremDB;
  vouched: VouchedHistory;
  deletion: SyncTombstone;
  retained: readonly EncryptedSyncFrame[];
}): Promise<EncryptedSyncFrame[]> => {
  const { db, vouched, deletion, retained } = options;
  const kept = new Set(retained.map((frame) => canonicalJson(frame)));
  const gone = [...vouched.admitted.values(), ...vouched.pending.values()].filter((frame) =>
    frame.entityTable === deletion.entityTable &&
    frame.entityId === deletion.entityId &&
    compareOperations(frame, deletion) <= 0 &&
    !kept.has(canonicalJson(frame)));
  const recorded = await db.syncInbox.bulkGet(gone.map((frame) => String(frame.operationId)));
  return gone.filter((_frame, index) => recorded[index] === undefined);
};

/**
 * Retire deletions nobody is waiting for, with the frames that carried them,
 * and return the ones retired.
 *
 * A tombstone is also what settles its entity's older history: while it stands,
 * an older put is visibly stale. This device's own operations never pass through
 * the inbox, so once the tombstone went nothing would say so — the ingestion
 * sweep would apply the put again and resurrect the entity, and a scope move
 * would read it as pending for as long as the window kept it. The verdicts are
 * recorded before the evidence goes, for the history `vouched` verified: while
 * the same frame is still the one retained, or from the copy verified once the
 * journal has lost it, since a peer may still replay it. A later operation is
 * left alone: it may yet restore the entity.
 *
 * A deletion goes only once every older operation it settles has a verdict, or
 * can never be admitted. One refused now may pass later — an identity row that
 * replicates after its frame makes it verifiable on the next sweep — and it would
 * then resurrect the entity if the deletion were already gone. Such a deletion
 * stays, with its frame and that history, until the history verifies. And it
 * goes only while it is still the entity's tombstone: ingestion may have replaced
 * it with a later deletion while the history was vouched for, and that one stays.
 *
 * Call inside a transaction over `syncOperations`, `syncTombstones` and
 * `syncInbox`, so the verdicts and the release commit together.
 */
export const releaseDeletions = async (
  db: LoremDB,
  released: readonly SyncTombstone[],
  vouched: VouchedHistory,
): Promise<SyncTombstone[]> => {
  const receipts: SyncInboxEntry[] = [];
  const retired: SyncTombstone[] = [];
  for (const deletion of released) {
    const standing = await db.syncTombstones.get([deletion.entityTable, deletion.entityId]);
    if (String(standing?.operationId) !== String(deletion.operationId)) continue;
    const settled: SyncInboxEntry[] = [];
    let held = false;
    const history = await unsettledBy(db, deletion);
    for (const retained of history) {
      const id = String(retained.operationId);
      const frame = vouched.admitted.get(id);
      if (stillVouched(frame, retained)) settled.push(receiptOf(frame, deletion));
      // Anything else holds it: history that may yet pass, or that changed since.
      else if (!stillVouched(vouched.inadmissible.get(id), retained)) held = true;
    }
    // History the journal no longer holds as it was: a verified frame is settled
    // all the same, from the copy verified, and one that may yet pass holds the
    // deletion, unless another frame under its id was verified and settles it.
    for (const frame of await vanishedSince({ db, vouched, deletion, retained: history })) {
      const verified = vouched.admitted.get(String(frame.operationId));
      if (verified === undefined) held = true;
      else if (stillVouched(verified, frame)) settled.push(receiptOf(frame, deletion));
    }
    if (held) continue;
    receipts.push(...settled);
    retired.push(deletion);
  }
  await db.syncInbox.bulkAdd(receipts);
  await db.syncTombstones.bulkDelete(
    retired.map((tombstone) => [tombstone.entityTable, tombstone.entityId]),
  );
  await db.syncOperations.bulkDelete(
    retired.map((tombstone) => String(tombstone.operationId)),
  );
  return retired;
};

/**
 * Keep a copy of the history `vouched` found may yet be admitted, while a
 * deletion it would settle still stands. The journal can lose such a frame — a
 * compaction replicated from another device drops it — and a peer can replay
 * it once its author is known; the copy keeps the deletion held until then,
 * across passes. A copy goes once its operation has a verdict, can never be
 * admitted, or has no deletion left to hold.
 *
 * Call inside the transaction that releases or holds the deletions, after them.
 */
export const keepPendingHistory = async (
  db: LoremDB,
  vouched: VouchedHistory,
): Promise<void> => {
  const standing = new Set((await db.syncTombstones.toArray()).map(entityKey));
  await db.syncPendingHistory.bulkPut(
    [...vouched.pending.values()].filter((frame) => standing.has(entityKey(frame))),
  );
  const kept = await db.syncPendingHistory.toArray();
  const recorded = await db.syncInbox.bulkGet(kept.map((frame) => String(frame.operationId)));
  await db.syncPendingHistory.bulkDelete(
    kept
      .filter((frame, index) =>
        recorded[index] !== undefined ||
        // This copy itself, not merely a row under its id, can never be admitted.
        stillVouched(vouched.inadmissible.get(String(frame.operationId)), frame) ||
        !standing.has(entityKey(frame)))
      .map((frame) => String(frame.operationId)),
  );
};

/**
 * What the retention window must leave for the deletions still standing, of the
 * frames in `dropping`: each tombstone's own frame, and older history it has not
 * settled that may yet be admitted. A frame gone without a verdict would replay
 * as new once it could be, and resurrect the entity after its deletion went.
 * History `vouched` admitted is settled as it goes instead, its verdict recorded
 * here, and so is such history that has already gone; history that never can be
 * admitted goes as it is.
 *
 * Call inside the transaction that drops the frames.
 */
export const holdAgainstWindow = async (
  db: LoremDB,
  vouched: VouchedHistory,
  dropping: ReadonlySet<string>,
): Promise<ReadonlySet<string>> => {
  const held = new Set<string>();
  const receipts: SyncInboxEntry[] = [];
  for (const tombstone of await db.syncTombstones.toArray()) {
    const own = String(tombstone.operationId);
    held.add(own);
    const history = await unsettledBy(db, tombstone);
    for (const retained of history) {
      const id = String(retained.operationId);
      if (id === own || !dropping.has(id)) continue;
      const frame = vouched.admitted.get(id);
      if (stillVouched(frame, retained)) receipts.push(receiptOf(frame, tombstone));
      else if (!stillVouched(vouched.inadmissible.get(id), retained)) held.add(id);
    }
    // Verified history the journal no longer holds as it was is settled from the
    // copy verified.
    for (const frame of await vanishedSince({ db, vouched, deletion: tombstone, retained: history })) {
      const id = String(frame.operationId);
      if (id !== own && stillVouched(vouched.admitted.get(id), frame)) {
        receipts.push(receiptOf(frame, tombstone));
      }
    }
  }
  await db.syncInbox.bulkAdd(receipts);
  return held;
};

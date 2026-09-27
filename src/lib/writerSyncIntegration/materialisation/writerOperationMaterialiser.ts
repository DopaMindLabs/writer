import type { LoremDB } from '@/db/LoremDB';
import type { SyncKeyRing } from 'writer-sync/crypto';
import { openOperationPayload } from 'writer-sync/crypto';
import { assertAcceptableRemoteTime, compareTimestamps } from 'writer-sync/core';
import { compareOperations, supersedes } from 'writer-sync/operations';
import { verifyFrame } from 'writer-sync/operations';
import type { MaterialiseResult } from 'writer-sync/operations';
import type { EncryptedSyncFrame, SyncTombstone } from 'writer-sync/operations';
import { writerClock } from '@/lib/writerSyncIntegration/writerLogicalClock';
import { chunkedBlobFieldFor } from '@/lib/writerSyncIntegration/writerTablePolicy';
import { materialiseAttachmentFrame } from './attachmentFrameMaterialiser';
import { hasLogicalTime } from './journalledRow';
import { tombstoneOf } from './tombstone';
import {
  UntrustedFrameError,
  requireJournalledTable,
  type JournalledTable,
} from './frameAdmission';
import type { FrameVerifier } from './writerFrameVerifier';

export { AttachmentChunksPendingError } from './attachmentFrameMaterialiser';
export { DisallowedOperationTableError, UntrustedFrameError } from './frameAdmission';

/**
 * Applies inbound operation frames to Writer's local state. The invariants the
 * runbook demands live here:
 *
 * - an operation is applied only if a device this one trusts signed it, whatever
 *   route it arrived by;
 * - an operation may only name a table the policy journals as synced content,
 *   so a paired device cannot reach this device's control tables;
 * - an operation stamped further ahead than the clock will merge is refused
 *   rather than allowed to win conflicts the clock has already disowned;
 * - an accepted operation id replays as a no-op (the inbox is checked and
 *   written in the same transaction as materialisation);
 * - entity conflicts resolve deterministically (hybrid logical time, then
 *   device id — never provider arrival order), for deletions as much as puts;
 * - deletes create tombstones, and a stale put can never resurrect a
 *   tombstoned entity;
 * - a put that has already lost is settled without its attachment content,
 *   which the chunk store stops holding once a later operation replaces it;
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

/**
 * Whether a strictly later put has already been applied here. Its frame may be
 * journalled, or compacted away once every peer held it, leaving only the saved
 * row's logical time. That time is kept in the clear, and a cursor read passes
 * the encryption middleware by, so no content is decrypted to learn it. An
 * exact tie is left to the journal: the row does not record its author.
 */
const laterPutApplied = async (options: {
  db: LoremDB;
  frame: EncryptedSyncFrame;
  table: JournalledTable;
}): Promise<boolean> => {
  const { db, frame, table } = options;
  const winner = await journalWinner(db, frame);
  if (winner && compareOperations(winner, frame) > 0 && winner.kind === 'put') return true;
  const saved = await table.where(':id').equals(frame.entityId).filter(hasLogicalTime).first();
  return saved !== undefined && compareTimestamps(saved.logicalUpdatedAt, frame.logicalAt) > 0;
};

const applyDelete = async (options: {
  db: LoremDB;
  frame: EncryptedSyncFrame;
  table: JournalledTable;
}): Promise<MaterialiseResult> => {
  const { db, frame, table } = options;
  if (await laterPutApplied(options)) {
    // This deletion lost. Removing the row here would let provider arrival
    // order discard newer content — the same rule `applyPut` applies in the
    // other direction.
    return 'superseded';
  }
  const tombstone = tombstoneOf(frame);
  const recorded = await db.syncTombstones.get([frame.entityTable, frame.entityId]);
  // Keep the latest deletion: an older delete arriving afterwards must not
  // rewrite the tombstone a later put is compared against.
  if (!recorded || supersedes(frame, { ...frame, ...recorded })) {
    await db.syncTombstones.put(tombstone);
  }
  await table.delete(frame.entityId);
  return 'applied';
};

/**
 * A put whose content was skipped because it was losing, found winning once its
 * transaction opened: a rival or deletion went in between.
 */
class LosingPutWonError extends Error {
  constructor(entityId: string) {
    super(`The put for ${entityId} won after its content was skipped`);
    this.name = 'LosingPutWonError';
  }
}

interface PutVerdict {
  result: MaterialiseResult;
  /** The deletion a winning put overturns, if there is one. */
  tombstone: SyncTombstone | undefined;
}

/** What a put would do to local state, decided before its content is needed. */
const putVerdict = async (options: {
  db: LoremDB;
  frame: EncryptedSyncFrame;
  table: JournalledTable;
}): Promise<PutVerdict> => {
  const { db, frame } = options;
  const tombstone = await db.syncTombstones.get([frame.entityTable, frame.entityId]);
  if (tombstone && !supersedes(frame, { ...frame, ...tombstone })) {
    // The deletion is later (or ties) — the put is stale and must not
    // resurrect the entity.
    return { result: 'tombstoned', tombstone };
  }
  // A strictly later put has already been applied; this one lost.
  if (await laterPutApplied(options)) return { result: 'superseded', tombstone };
  return { result: 'applied', tombstone };
};

const applyPut = async (options: {
  db: LoremDB;
  frame: EncryptedSyncFrame;
  table: JournalledTable;
  row: Record<string, unknown> | null;
}): Promise<MaterialiseResult> => {
  const { db, frame, table, row } = options;
  const { result, tombstone } = await putVerdict({ db, frame, table });
  if (result !== 'applied') return result;
  // Content is assembled only for a put expected to win; the caller assembles
  // it for one that was losing then and wins now.
  if (row === null) throw new LosingPutWonError(frame.entityId);
  if (tombstone) {
    await db.syncTombstones.delete([frame.entityTable, frame.entityId]);
  }
  await table.put(row);
  return 'applied';
};

/**
 * The row a put would write. An attachment's ciphertext travels apart from its
 * frame, and the chunk store holds only the entity's latest: a scope move, for
 * one, reseals it under the destination. A put already overtaken by a later
 * operation or a deletion writes nothing, so it is settled without the
 * ciphertext it named rather than waiting for chunks no device still holds.
 */
const contentFor = async (options: {
  db: LoremDB;
  frame: EncryptedSyncFrame;
  table: JournalledTable;
  ring: SyncKeyRing;
  row: Record<string, unknown>;
  /** False once the put has been found winning after all: assemble regardless. */
  skipLosing: boolean;
}): Promise<Record<string, unknown> | null> => {
  const { frame, skipLosing } = options;
  const chunked = chunkedBlobFieldFor(frame.entityTable) !== undefined;
  if (chunked && skipLosing && (await putVerdict(options)).result !== 'applied') return null;
  return materialiseAttachmentFrame(options);
};

/**
 * Journal, apply and stamp one admitted frame in one transaction. An accepted
 * operation id replays as its recorded result without touching state.
 */
const commitFrame = (options: {
  db: LoremDB;
  frame: EncryptedSyncFrame;
  table: JournalledTable;
  row: Record<string, unknown> | null;
}): Promise<MaterialiseResult> => {
  const { db, frame, table, row } = options;
  return db.transaction(
    'rw',
    [table, db.syncOperations, db.syncInbox, db.syncTombstones],
    async () => {
      const prior = await db.syncInbox.get(String(frame.operationId));
      if (prior) return prior.result;
      // The received ciphertext is journalled verbatim — immutable, never
      // re-encrypted — so this device can serve it onward to other providers.
      await db.syncOperations.put(frame);
      const result =
        frame.kind === 'delete'
          ? await applyDelete({ db, frame, table })
          : await applyPut({ db, frame, table, row });
      await db.syncInbox.put({
        operationId: frame.operationId,
        accessScopeId: frame.accessScopeId,
        deviceId: frame.deviceId,
        logicalAt: frame.logicalAt,
        entityTable: frame.entityTable,
        entityId: frame.entityId,
        result,
        receivedAt: frame.logicalAt.millis,
      });
      return result;
    },
  );
};

/**
 * Verify, journal, and materialise one inbound frame. Idempotent: an already
 * accepted operation id returns its recorded result without touching state.
 * The payload is decrypted before the transaction opens (Web Crypto must not
 * suspend a live IndexedDB transaction); everything stateful commits atomically.
 *
 * Admission runs in one order for every provider: structure and payload hash,
 * then the table policy, then the author, then the clock. The peer exchange
 * verifies signatures again before journalling — the two are defence in depth,
 * not a duplicate, because a frame reaching this point may never have crossed a
 * peer link at all.
 */
export const applyInboundFrame = async (options: {
  db: LoremDB;
  frame: unknown;
  ring: SyncKeyRing;
  /**
   * Who this device is willing to accept an operation from. Required rather
   * than defaulted: an ingestion path that forgot it would apply whatever a
   * provider chose to write into the journal.
   */
  verifySignature: FrameVerifier;
  /** This device's wall clock, injectable so boundary tests are deterministic. */
  now?: () => number;
}): Promise<MaterialiseResult> => {
  const { db, ring } = options;
  const frame = await verifyFrame(options.frame);
  // What a peer proved by signing is who it is, never what it may write to.
  // Nothing below this line — decryption, the journal, the transaction — runs
  // for an operation naming a table peers do not own.
  const table = requireJournalledTable(db, frame.entityTable);
  // Nor is a hash any evidence of an author: whoever wrote this frame into the
  // journal must be someone this device trusts, checked here so the check
  // cannot be skipped by the route the frame took to get here.
  if (!(await options.verifySignature(frame))) {
    throw new UntrustedFrameError(String(frame.deviceId));
  }
  // Nor may it be stamped in a future this device's clock refuses to merge:
  // such an operation would win every conflict it entered while the clock that
  // rejected it stood still.
  assertAcceptableRemoteTime(frame.logicalAt, options.now ?? (() => Date.now()));
  const opened =
    frame.kind === 'put' ? await openOperationPayload(ring, frame, frame.payload) : null;

  const commit = async (skipLosing: boolean): Promise<MaterialiseResult> =>
    commitFrame({
      db, frame, table,
      row: opened === null ? null : await contentFor({ db, frame, table, ring, row: opened, skipLosing }),
    });
  let result: MaterialiseResult;
  try {
    result = await commit(true);
  } catch (error) {
    if (!(error instanceof LosingPutWonError)) throw error;
    // Losing when its content was skipped, winning when its transaction opened:
    // nothing else would call again for it, so assemble the content now.
    result = await commit(false);
  }
  // The frame's logical time joins this device's clock, so the next local edit
  // is stamped after every operation this device has accepted — a device whose
  // wall clock lags would otherwise keep losing conflicts it should win.
  writerClock.observe(frame.logicalAt);
  return result;
};

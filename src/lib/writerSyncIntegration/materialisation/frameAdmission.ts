import type { Table } from 'dexie';
import type { LoremDB } from '@/db/LoremDB';
import { policyFor } from '@/lib/writerSyncIntegration/writerTablePolicy';
import { assertAcceptableRemoteTime, compareTimestamps } from 'writer-sync/core';
import {
  decodeFrame, verifyFrame, type EncryptedSyncFrame, type SyncInboxEntry,
} from 'writer-sync/operations';
import { verifiesAgainstRecordedKey, type FrameVerifier } from './writerFrameVerifier';

/**
 * What an inbound frame must satisfy before any of this device's state is
 * touched by it.
 *
 * A signature proves which paired device sent an operation; it grants no
 * permission over what that operation may name. The frame codec accepts any
 * non-empty `entityTable`, so the table an operation is allowed to mutate is
 * decided here, from the table policy, and nowhere else — a second hand-written
 * list would be a second place for the rule to drift.
 */

/** An inbound operation nothing this device trusts is willing to vouch for. */
export class UntrustedFrameError extends Error {
  constructor(deviceId: string) {
    super(`No trusted identity signed the operation device ${deviceId} claims`);
    this.name = 'UntrustedFrameError';
  }
}

/** An inbound operation named a table no peer may mutate on this device. */
export class DisallowedOperationTableError extends Error {
  constructor(entityTable: string) {
    super(`Table ${entityTable} does not accept inbound operations`);
    this.name = 'DisallowedOperationTableError';
  }
}

/** A journalled table's rows, as an inbound operation mutates them. */
export type JournalledTable = Table<Record<string, unknown>, string>;

/**
 * The table an inbound operation names, or a rejection.
 *
 * The lookup and the permission check are one call so no ingestion path can
 * perform the first without the second: only tables whose own mutations are
 * journalled and replicated as content may be written by a peer. Control tables
 * — the crypto escrow, the trust registry, the provider's own records — and
 * local-only tables are refused, as is a table this app does not know.
 */
export const requireJournalledTable = (
  db: LoremDB,
  entityTable: string,
): JournalledTable => {
  const policy = policyFor(entityTable);
  if (policy?.replication !== 'synced-content' || !policy.operationJournal) {
    throw new DisallowedOperationTableError(entityTable);
  }
  return db.table<Record<string, unknown>, string>(entityTable);
};

/**
 * The journal rows that decode as frames. A provider writes rows, not frames:
 * one that does not decode has no order or age to judge it by, and admission,
 * which decodes first, will never accept it. It is inert, and left out.
 */
export const readableFrames = (rows: readonly unknown[]): EncryptedSyncFrame[] =>
  rows.flatMap((row) => {
    try {
      return [decodeFrame(row)];
    } catch {
      // Malformed: nothing to order, and nothing admission would accept.
      return [];
    }
  });

/**
 * The frame as materialisation would admit it — structure and payload hash,
 * table policy, a trusted signature, a clock it will merge — or `null` when it
 * would not. For decisions taken beside materialisation that must never rest on
 * what a provider merely wrote into the journal.
 */
export const admittedFrame = async (options: {
  db: LoremDB;
  candidate: EncryptedSyncFrame;
  verifySignature: FrameVerifier;
}): Promise<EncryptedSyncFrame | null> => {
  const { db, candidate, verifySignature } = options;
  try {
    const frame = await verifyFrame(candidate);
    requireJournalledTable(db, frame.entityTable);
    assertAcceptableRemoteTime(frame.logicalAt, () => Date.now());
    return (await verifySignature(frame)) ? frame : null;
  } catch {
    // Malformed, disallowed or out of clock range: refused exactly as ingestion
    // refuses it, and a refusal is all the caller needs.
    return null;
  }
};

/** Whether an inbox entry records this frame's operation, author, entity, scope and time. */
const recordsFrame = (entry: SyncInboxEntry, frame: EncryptedSyncFrame): boolean =>
  String(entry.operationId) === String(frame.operationId) &&
  String(entry.deviceId) === String(frame.deviceId) &&
  entry.entityTable === frame.entityTable &&
  entry.entityId === frame.entityId &&
  entry.accessScopeId === frame.accessScopeId &&
  compareTimestamps(entry.logicalAt, frame.logicalAt) === 0;

/**
 * The frame as this device accepted it earlier, or `null`. Its inbox entry, this
 * device's own record of that admission, names the same operation by the same
 * author for the same entity, scope and time, and its signature still verifies
 * against the key on record for that author. Revoking the author since refuses
 * what arrives from now on, not what was accepted already; a frame altered since
 * fails the signature, whatever the entry says.
 */
export const acceptedEarlier = async (options: {
  db: LoremDB;
  candidate: EncryptedSyncFrame;
  entry: SyncInboxEntry | undefined;
}): Promise<EncryptedSyncFrame | null> => {
  const { db, candidate, entry } = options;
  if (entry === undefined) return null;
  try {
    const frame = await verifyFrame(candidate);
    requireJournalledTable(db, frame.entityTable);
    if (!recordsFrame(entry, frame)) return null;
    return (await verifiesAgainstRecordedKey(db, frame)) ? frame : null;
  } catch {
    // Malformed, or aimed at a table peers do not own: no earlier admission covers it.
    return null;
  }
};

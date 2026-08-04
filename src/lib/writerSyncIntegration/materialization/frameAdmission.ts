import type { Table } from 'dexie';
import type { LoremDB } from '@/db/LoremDB';
import { policyFor } from '@/lib/writerSyncIntegration/writerTablePolicy';

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

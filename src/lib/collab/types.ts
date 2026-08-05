/**
 * Engine-agnostic collaboration adapter interfaces.
 *
 * This module deliberately imports nothing from `yjs` (or any engine): it is the
 * seam the Yjs provider, transports, and store are written against, so an
 * alternative CRDT engine could be swapped in without touching call sites.
 */

/** The awareness state a peer publishes about itself. */
export interface PresenceState {
  authorId: string;
  name: string;
  hue: string;
  tabId: string;
}

/**
 * The byte channel a provider and its transports are written against. Defined by
 * the sync engine (`writer-sync/core`) and re-exported here so the collaboration
 * layer keeps one name for it: a transport is a transport whether it carries
 * CRDT updates or encrypted operation frames.
 */
export type { SyncTransport } from 'writer-sync/core';

/** Durable store for a document's append-only CRDT update log. */
export interface CollabStore {
  readonly append: (docId: string, bytes: Uint8Array) => Promise<void>;
  readonly loadAll: (docId: string) => Promise<Uint8Array[]>;
  readonly compact: (docId: string) => Promise<void>;
  readonly deleteDoc: (docId: string) => Promise<void>;
  /**
   * Resolve once every {@link append} for `docId` that was in flight at the call
   * has reached the durable log. A restore drives content through the live
   * editor, which persists asynchronously via the provider; this is the barrier
   * that lets the caller await that write landing before treating the restore as
   * complete — so cloud reconciliation never records success for a CRDT update
   * that has not persisted. Rejects if one of those appends failed, surfacing a
   * persistence failure rather than hiding it behind a false success. A no-op
   * when nothing is in flight.
   */
  readonly whenPersisted: (docId: string) => Promise<void>;
  /**
   * Atomically plant the initial state for a document exactly once. Returns
   * `'seeded'` for the caller that won the race and `'already-seeded'` for any
   * later caller.
   */
  readonly trySeed: (
    docId: string,
    seed: Uint8Array,
  ) => Promise<'seeded' | 'already-seeded'>;
  /**
   * Repair a document whose update log was lost (e.g. the cloud addon's logout
   * cleared the local-only tables): plant `seed` **only if** the log is empty,
   * atomically with the emptiness check. Returns `'seeded'` when it planted one
   * and `'occupied'` when the log already held updates. Unlike {@link trySeed}
   * it keys off the log's contents, not a seed marker, so a stale marker left
   * beside an empty log cannot block the repair.
   */
  readonly reseedIfEmpty: (
    docId: string,
    seed: Uint8Array,
  ) => Promise<'seeded' | 'occupied'>;
}

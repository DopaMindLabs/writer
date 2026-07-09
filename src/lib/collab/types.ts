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
 * A bidirectional byte channel between peers editing the same document.
 *
 * `sharesStore` is `true` when the peers on the other end persist to the *same*
 * local store as us (e.g. a `BroadcastChannel` between tabs of one browser), and
 * `false` for remote peers (e.g. a relay) whose updates we must persist
 * ourselves. The provider uses this to avoid double-persisting shared-store
 * updates.
 */
export interface SyncTransport {
  readonly sharesStore: boolean;
  readonly send: (bytes: Uint8Array) => void;
  /** Register a listener for inbound messages; returns an unsubscribe fn. */
  readonly onMessage: (cb: (bytes: Uint8Array) => void) => () => void;
  readonly close: () => void;
}

/** Durable store for a document's append-only CRDT update log. */
export interface CollabStore {
  readonly append: (docId: string, bytes: Uint8Array) => Promise<void>;
  readonly loadAll: (docId: string) => Promise<Uint8Array[]>;
  readonly compact: (docId: string) => Promise<void>;
  readonly deleteDoc: (docId: string) => Promise<void>;
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

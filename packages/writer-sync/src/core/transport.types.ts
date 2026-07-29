/**
 * The transport seam: a bidirectional byte channel between peers.
 *
 * Deliberately the narrowest possible contract — send bytes, receive bytes,
 * close — so a BroadcastChannel between tabs, a WebRTC data channel and a relay
 * socket are all the same thing to the engine. Nothing here knows what the bytes
 * mean, which is what lets the CRDT layer and the operation protocol share it.
 */

/**
 * `sharesStore` is `true` when the peers on the other end persist to the *same*
 * local store as us (e.g. a `BroadcastChannel` between tabs of one browser), and
 * `false` for remote peers (e.g. a relay) whose updates we must persist
 * ourselves. A consumer uses this to avoid double-persisting shared-store
 * updates.
 */
export interface SyncTransport {
  readonly sharesStore: boolean;
  readonly send: (bytes: Uint8Array) => void;
  /** Register a listener for inbound messages; returns an unsubscribe fn. */
  readonly onMessage: (cb: (bytes: Uint8Array) => void) => () => void;
  readonly close: () => void;
}

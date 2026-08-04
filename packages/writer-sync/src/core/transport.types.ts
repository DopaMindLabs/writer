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
  /**
   * The largest message this bearer will carry, in bytes, when it has such a
   * ceiling. A sender must size what it hands to {@link send} against this —
   * a WebRTC data channel refuses larger frames — and a transport with no
   * ceiling (a BroadcastChannel between tabs) simply leaves it unset.
   */
  readonly maxMessageBytes?: number;
  readonly send: (bytes: Uint8Array) => void;
  /** Register a listener for inbound messages; returns an unsubscribe fn. */
  readonly onMessage: (cb: (bytes: Uint8Array) => void) => () => void;
  /**
   * Register a listener for the bearer going away on its own — the far end
   * closing, or the connection failing — and get back an unsubscribe fn.
   *
   * Not called for a {@link close} from this side, which is not news to whoever
   * asked for it. A consumer that keeps a transport rather than making one per
   * message needs this: without it, it has no way to tell that what it is holding
   * will never carry anything again, and every later message is written into
   * nothing. A bearer that cannot know (a `BroadcastChannel` between tabs of one
   * browser) leaves it unset.
   *
   * A reason travels with it when this device is the one ending the session —
   * a peer flooding it, or an outbox it can no longer hold — so a consumer can
   * say why sync stopped rather than only that it did. A bearer that simply
   * went away passes none.
   */
  readonly onClosed?: (cb: (reason?: Error) => void) => () => void;
  readonly close: () => void;
}

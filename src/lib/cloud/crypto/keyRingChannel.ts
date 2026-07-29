/**
 * Cross-tab device-key-ring synchronisation.
 *
 * The derived key ring is cached per tab (a process-local variable behind
 * {@link import('./keyStore').deviceKeyProvider}), while the persisted ring lives
 * in the shared `lipsum-cloud-keystore` IndexedDB. So unlocking in one tab updates
 * only *that* tab's cache: sibling tabs keep hiding sealed rows until they reload.
 *
 * This channel closes that gap with an **invalidation-only** broadcast — never key
 * material. After a tab commits a save or forget it posts a small signal; every
 * other tab responds by reloading the authoritative ring from IndexedDB (which
 * bumps its key revision and re-runs encrypted live queries). The receive path
 * never rebroadcasts, so tabs cannot form a message loop.
 */
const KEYRING_CHANNEL = 'lipsum-cloud-keyring';

/** `changed` = a ring was saved/acquired; `forgotten` = it was dropped. */
export type KeyRingOp = 'changed' | 'forgotten';

interface KeyRingMessage {
  /** Origin tab, so a tab ignores the echo of its own broadcast. */
  source: string;
  op: KeyRingOp;
}

const hasChannel = (): boolean => typeof BroadcastChannel !== 'undefined';

const makeSourceId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${KEYRING_CHANNEL}-${Date.now().toString(36)}`;
};

/** A stable per-tab id; identifies this tab as the origin of its own broadcasts. */
const sourceId: string = makeSourceId();

const isKeyRingMessage = (data: unknown): data is KeyRingMessage =>
  typeof data === 'object' &&
  data !== null &&
  typeof (data as KeyRingMessage).source === 'string' &&
  ((data as KeyRingMessage).op === 'changed' || (data as KeyRingMessage).op === 'forgotten');

/**
 * Tell other tabs the device key ring changed. Opens, posts, and closes a channel
 * (matching `docReloadChannel`); a no-op where `BroadcastChannel` is unavailable —
 * a documented degraded mode, never a fall back to key material in `localStorage`.
 */
export const broadcastKeyRingChange = (op: KeyRingOp): void => {
  if (!hasChannel()) return;
  const channel = new BroadcastChannel(KEYRING_CHANNEL);
  const message: KeyRingMessage = { source: sourceId, op };
  channel.postMessage(message);
  channel.close();
};

/**
 * Listen for other tabs' key-ring changes and reload the authoritative ring when
 * one arrives. `onForeignChange` defaults to nothing so callers inject
 * `loadDeviceKeyRing` (keeping this module free of a keyStore import cycle).
 * Returns an unsubscribe that removes the listener and closes the channel.
 */
export const startKeyRingChannel = (
  onForeignChange: () => void | Promise<void>,
): (() => void) => {
  if (!hasChannel()) return () => undefined;
  const channel = new BroadcastChannel(KEYRING_CHANNEL);
  channel.onmessage = (event: MessageEvent) => {
    const data: unknown = event.data;
    // Ignore malformed messages and this tab's own echo; never rebroadcast here.
    if (!isKeyRingMessage(data) || data.source === sourceId) return;
    void onForeignChange();
  };
  return () => {
    channel.onmessage = null;
    channel.close();
  };
};

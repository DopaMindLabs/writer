/**
 * A tiny synchronous signal that forces the two-device-limit blocked state, so
 * the blocked surface can be driven headlessly in dev/e2e (`?cloud-devices=full`)
 * — the real trigger needs a live signed-in account with a full registry.
 * Mirrors {@link import('./crypto/keylessLock').keylessLockState} in shape and is
 * kept out of any React store so it can be read without a hook.
 */
let forcedFull = false;
const listeners = new Set<() => void>();

export const deviceLimitState = {
  /** Synchronous read for the blocked computation. */
  current: (): boolean => forcedFull,
  /** Set the forced-full flag and notify subscribers. */
  set: (value: boolean): void => {
    if (value === forcedFull) return;
    forcedFull = value;
    for (const listener of listeners) listener();
  },
  /** Subscribe to changes (for `useSyncExternalStore`); returns an unsubscribe. */
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

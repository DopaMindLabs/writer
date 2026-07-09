/**
 * A tiny synchronous signal for the "signed in, but this device holds no key
 * ring" state. While it is on, the write middleware refuses content mutations on
 * encrypted tables so a signed-in-but-keyless device can never seal plaintext
 * into — or push plaintext through — the sync queue. Mirrors {@link keyMismatchState}
 * in shape (read synchronously by the middleware, subscribable by the UI) and is
 * kept out of any React store so the middleware can poll it without a hook.
 */
let keyless = false;
const listeners = new Set<() => void>();

export const keylessLockState = {
  /** Synchronous read for the middleware. */
  current: (): boolean => keyless,
  /** Set the keyless-lock flag and notify subscribers. */
  set: (value: boolean): void => {
    if (value === keyless) return;
    keyless = value;
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

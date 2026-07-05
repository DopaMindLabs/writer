/**
 * A tiny synchronous signal for the "this device's key is not the account's key"
 * state, detected by escrow reconciliation. The write middleware polls it
 * synchronously to block content mutations under a mismatch, and the UI
 * subscribes to it to show the conflict-resolution surface. Kept out of any
 * React store so the middleware can read it without a hook.
 */
let mismatched = false;
const listeners = new Set<() => void>();

export const keyMismatchState = {
  /** Synchronous read for the middleware. */
  current: (): boolean => mismatched,
  /** Set the mismatch flag and notify subscribers. */
  set: (value: boolean): void => {
    if (value === mismatched) return;
    mismatched = value;
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

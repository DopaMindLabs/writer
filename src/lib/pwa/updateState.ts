/**
 * A tiny synchronous signal for the "a new service-worker build is waiting"
 * state, raised by the PWA registration and consumed by the update banner.
 * Mirrors the `keyMismatchState` pattern: kept out of any React store so it can
 * be set from plain boot code, and subscribed to via `useSyncExternalStore`.
 * The apply callback is the plugin's activate-and-reload handle, stored here so
 * the UI never imports the registration internals.
 */
let updateReady = false;
let applyCallback: (() => void) | null = null;
const listeners = new Set<() => void>();

export const pwaUpdateState = {
  /** Synchronous read of the update-ready flag. */
  current: (): boolean => updateReady,
  /** Set the update-ready flag and notify subscribers. */
  set: (value: boolean): void => {
    if (value === updateReady) return;
    updateReady = value;
    for (const listener of listeners) listener();
  },
  /** Subscribe to changes (for `useSyncExternalStore`); returns an unsubscribe. */
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Store (or clear) the activate-and-reload handle for the waiting worker. */
  setApplyCallback: (callback: (() => void) | null): void => {
    applyCallback = callback;
  },
  /** Activate the waiting worker and reload; a no-op when none is stored. */
  applyUpdate: (): void => {
    applyCallback?.();
  },
};

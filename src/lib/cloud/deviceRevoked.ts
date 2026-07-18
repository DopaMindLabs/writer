/**
 * A tiny synchronous signal that this device's slot was revoked from another
 * device. The registrar sets it whenever it pulls its own row back carrying a
 * `revokedAt`, and the Cloud panel reads it to tell the user rather than leaving
 * them wondering why the device quietly stopped holding a slot.
 *
 * Mirrors {@link import('./deviceLimit').deviceLimitState} in shape and is kept
 * out of any React store so it can be read without a hook.
 */
let revoked = false;
const listeners = new Set<() => void>();

export const deviceRevokedState = {
  /** Synchronous read for the panel's render flags. */
  current: (): boolean => revoked,
  /** Set the revoked flag and notify subscribers. */
  set: (value: boolean): void => {
    if (value === revoked) return;
    revoked = value;
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

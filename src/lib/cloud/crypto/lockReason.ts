import { keyMismatchState } from './keyMismatch';
import { keylessLockState } from './keylessLock';

/** Why content writes to encrypted tables are refused, if they are. */
export type LockReason = 'none' | 'mismatch' | 'keyless';

/**
 * The active write-lock reason, with the same precedence the middleware enforces:
 * a detected key **mismatch** wins over the signed-in-**keyless** state, and both
 * over **none**. Read synchronously (no React), so the middleware and the UI share
 * one policy.
 */
export const currentLockReason = (): LockReason => {
  if (keyMismatchState.current()) return 'mismatch';
  if (keylessLockState.current()) return 'keyless';
  return 'none';
};

/**
 * Subscribe to lock-reason changes — fires whenever either underlying signal
 * changes. Returns an unsubscribe that detaches from both.
 */
export const subscribeLockReason = (listener: () => void): (() => void) => {
  const offMismatch = keyMismatchState.subscribe(listener);
  const offKeyless = keylessLockState.subscribe(listener);
  return () => {
    offMismatch();
    offKeyless();
  };
};

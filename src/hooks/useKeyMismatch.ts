import { useSyncExternalStore } from 'react';
import { keyMismatchState } from '@/lib/cloud/crypto/keyMismatch';

/**
 * Reactively track whether this device's key mismatches the account's, as
 * detected by escrow reconciliation. Drives the conflict-resolution surface.
 */
export const useKeyMismatch = (): boolean =>
  useSyncExternalStore(keyMismatchState.subscribe, keyMismatchState.current);

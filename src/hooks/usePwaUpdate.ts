import { useSyncExternalStore } from 'react';
import { pwaUpdateState } from '@/lib/pwa/updateState';

export interface PwaUpdate {
  /** True once a new build's service worker is waiting to activate. */
  updateReady: boolean;
  /** Activate the waiting worker and reload this tab. */
  applyUpdate: () => void;
}

/**
 * Reactively track whether a new app build is ready to activate. Drives the
 * update banner; applying hands over to the registration's reload handle.
 */
export const usePwaUpdate = (): PwaUpdate => ({
  updateReady: useSyncExternalStore(
    pwaUpdateState.subscribe,
    pwaUpdateState.current,
  ),
  applyUpdate: pwaUpdateState.applyUpdate,
});

import { useSyncExternalStore } from 'react';
import {
  reconcileStatus,
  type ReconcileStatus,
} from '@/lib/cloud/reconcileStatus';

/**
 * The outcome of the last cloud document-reconciliation run, re-rendering the
 * caller on each change. Lets cloud settings distinguish slow sync from a failed
 * reconcile and offer a retry.
 */
export const useReconcileStatus = (): ReconcileStatus =>
  useSyncExternalStore(
    reconcileStatus.subscribe,
    reconcileStatus.current,
    reconcileStatus.current,
  );

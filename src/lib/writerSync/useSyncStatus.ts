import { useMemo } from 'react';
import { useCloudObservable } from '@/lib/cloud/cloudObservable';
import type { SyncStatus } from '@/lib/syncProviders/types';
import { SyncPhase } from '@/lib/syncProviders/types';
import { useSyncCapability } from './syncCoordinatorContext';

const INITIAL: SyncStatus = { phase: SyncPhase.Initial };

/** Never emits — for when no configured provider replicates. */
const NONE = { subscribe: () => ({ unsubscribe: () => undefined }) };

/**
 * The replication status of the first provider that offers durable sync, in the
 * provider-neutral vocabulary. Reports {@link SyncPhase.Initial} when no
 * provider does — nothing has run, because nothing can.
 */
export const useSyncStatus = (): SyncStatus => {
  const frameSync = useSyncCapability('frameSync');
  return useCloudObservable(
    useMemo(() => frameSync?.status ?? NONE, [frameSync]),
    INITIAL,
  );
};

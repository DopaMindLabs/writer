import { useMemo } from 'react';
import { useCloudObservable } from '@/lib/cloud/cloudObservable';
import type { SyncStatus } from '@/lib/syncProviders/types';
import { SyncPhase } from '@/lib/syncProviders/types';
import { useDefaultSyncCapability } from './syncCoordinatorContext';

const INITIAL: SyncStatus = { phase: SyncPhase.Initial };

/** Never emits — for when no configured provider replicates. */
const NONE = { subscribe: () => ({ unsubscribe: () => undefined }) };

/**
 * The replication status of the application's default durable-sync provider, in
 * the provider-neutral vocabulary. Reports {@link SyncPhase.Initial} when the
 * default offers no durable sync (or none is configured) — nothing has run,
 * because nothing can.
 */
export const useSyncStatus = (): SyncStatus => {
  const durableSync = useDefaultSyncCapability('durableSync');
  return useCloudObservable(
    useMemo(() => durableSync?.status ?? NONE, [durableSync]),
    INITIAL,
  );
};

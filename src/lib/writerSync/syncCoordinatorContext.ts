import { createContext, useContext } from 'react';
import type { SyncCoordinator } from '@/lib/syncProviders/coordinator';
import type { SyncCapability, SyncProvider } from '@/lib/syncProviders/types';

/**
 * Makes the sync coordinator reachable from the UI, so components consume
 * capabilities rather than importing a backend. Nothing under `src/components`
 * or `src/hooks` should import a provider implementation — or the cloud facade
 * behind it — directly.
 */
export const SyncCoordinatorContext = createContext<SyncCoordinator | null>(null);

export const useSyncCoordinator = (): SyncCoordinator => {
  const coordinator = useContext(SyncCoordinatorContext);
  if (!coordinator) {
    throw new Error('useSyncCoordinator must be used inside <WriterSyncProvider>');
  }
  return coordinator;
};

/**
 * The first provider's implementation of `capability`, or `undefined` when no
 * configured provider offers it — and likewise outside a provider, which is how
 * a fully injected component renders in a test or story. Callers must handle
 * the absence: which capabilities exist depends on which providers are
 * configured, so a surface that needs one degrades rather than assumes.
 */
export const useSyncCapability = <C extends SyncCapability>(
  capability: C,
): SyncProvider[C] => {
  const coordinator = useContext(SyncCoordinatorContext);
  // `.at` rather than `[0]`: indexing types as present even when the array is
  // empty, which is exactly the case this hook exists to report.
  const provider = coordinator?.providersWith(capability).at(0);
  return provider?.[capability];
};

import { createContext, useContext } from 'react';
import type { SyncCoordinator } from '@/lib/syncProviders/coordinator';
import type {
  SyncCapability,
  SyncProvider,
  SyncProviderInstanceId,
} from '@/lib/syncProviders/types';
import { hasCapability } from '@/lib/syncProviders/types';

/** One provider narrowed to definitely offer `C`; `[C]` is that capability. */
type WithCapability<C extends SyncCapability> = SyncProvider &
  Required<Pick<SyncProvider, C>>;
type Capability<C extends SyncCapability> = WithCapability<C>[C];

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
 * The `capability` on one *named* provider instance, or `undefined` when the
 * instance is unknown, does not offer it, or the tree is outside a provider (how
 * a fully injected component renders in a test or story). Explicit selection by
 * id — never "the first capable provider".
 */
export const useSyncCapability = <C extends SyncCapability>(
  providerInstanceId: SyncProviderInstanceId,
  capability: C,
): Capability<C> | undefined => {
  const coordinator = useContext(SyncCoordinatorContext);
  return coordinator?.capability(providerInstanceId, capability);
};

/**
 * The `capability` on the application's *default* provider, or `undefined` when
 * configuration names no default, the default does not offer it, or the tree is
 * outside a provider. Callers must handle the absence: a surface that needs a
 * capability degrades rather than assumes one is configured.
 */
export const useDefaultSyncCapability = <C extends SyncCapability>(
  capability: C,
): Capability<C> | undefined => {
  const coordinator = useContext(SyncCoordinatorContext);
  const provider = coordinator?.defaultProvider();
  if (!provider || !hasCapability(provider, capability)) return undefined;
  return provider[capability];
};

/**
 * Every provider's `capability`, for surfaces that aggregate across all
 * configured providers without collapsing to one. Empty outside a provider or
 * when none offers it.
 */
export const useSyncCapabilities = <C extends SyncCapability>(
  capability: C,
): Capability<C>[] => {
  const coordinator = useContext(SyncCoordinatorContext);
  return coordinator?.capabilities(capability) ?? [];
};

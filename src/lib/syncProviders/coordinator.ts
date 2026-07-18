import { invariant } from '@/lib/invariant';
import type {
  SyncProvider,
  SyncProviderId,
  SyncProviderBinding,
  WriterSyncOptions,
  AccessScopeId,
} from './types';
import { hasCapability } from './types';

type CapabilityName = 'frameSync' | 'realtime' | 'discovery' | 'accessControl' | 'keyDelivery';

export interface SyncCoordinator {
  listProviders: () => SyncProvider[];
  resolveProvider: (id: SyncProviderId) => SyncProvider | undefined;
  findProviderWithCapability: (cap: CapabilityName) => SyncProvider | undefined;
  resolveBinding: (scopeId: AccessScopeId) => Promise<SyncProviderBinding | undefined>;
}

export const createSyncCoordinator = (options: WriterSyncOptions): SyncCoordinator => {
  const { providers } = options;

  // Validate no duplicate ids
  const ids = new Set<string>();
  for (const provider of providers) {
    invariant(
      !ids.has(provider.id),
      `Duplicate provider id: ${provider.id}`,
    );
    ids.add(provider.id);
  }

  return {
    listProviders: () => providers,

    resolveProvider: (id: SyncProviderId) =>
      providers.find((p) => p.id === id),

    findProviderWithCapability: (cap: CapabilityName) =>
      providers.find((p) => hasCapability(p, cap)),

    resolveBinding: async (scopeId: AccessScopeId) => {
      for (const provider of providers) {
        if (hasCapability(provider, 'accessControl') && provider.accessControl) {
          const binding = await provider.accessControl.resolveBinding(scopeId);
          if (binding) {
            return binding;
          }
        }
      }
      return undefined;
    },
  };
};

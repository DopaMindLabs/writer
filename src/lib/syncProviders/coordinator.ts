import { invariant } from '@/lib/invariant';
import type {
  AccessScopeId,
  SyncCapability,
  SyncProvider,
  SyncProviderBinding,
  SyncProviderId,
  WriterSyncOptions,
} from './types';
import { hasCapability } from './types';

/**
 * The single place the app composes its sync providers. It owns no transport of
 * its own: it registers providers, answers "who can do X", and resolves which
 * provider backs a given access scope.
 */
export interface SyncCoordinator {
  /** Every registered provider, in registration order. */
  providers: () => SyncProvider[];
  provider: (id: SyncProviderId) => SyncProvider | undefined;
  /** Every provider offering `capability`, in registration order. */
  providersWith: <C extends SyncCapability>(
    capability: C,
  ) => (SyncProvider & Required<Pick<SyncProvider, C>>)[];
  /**
   * The binding for `scopeId`, from the first access-control provider that
   * claims it. `undefined` when no provider does — an unshared, private scope.
   */
  resolveBinding: (scopeId: AccessScopeId) => Promise<SyncProviderBinding | undefined>;
}

const assertUniqueIds = (providers: SyncProvider[]): void => {
  const seen = new Set<SyncProviderId>();
  for (const { id } of providers) {
    invariant(!seen.has(id), `Duplicate sync provider id: ${id}`);
    seen.add(id);
  }
};

export const createSyncCoordinator = (options: WriterSyncOptions): SyncCoordinator => {
  // Copied once at construction: later mutation of the caller's array must not
  // change what this coordinator resolves.
  const registered = [...options.providers];
  assertUniqueIds(registered);

  const resolveBinding = async (
    scopeId: AccessScopeId,
  ): Promise<SyncProviderBinding | undefined> => {
    for (const provider of registered) {
      if (!hasCapability(provider, 'accessControl')) continue;
      const binding = await provider.accessControl.resolveBinding(scopeId);
      if (binding) return binding;
    }
    return undefined;
  };

  return {
    providers: () => [...registered],
    provider: (id) => registered.find((candidate) => candidate.id === id),
    providersWith: (capability) =>
      registered.filter((candidate) => hasCapability(candidate, capability)),
    resolveBinding,
  };
};

import type {
  AccessScopeId,
  SyncCapability,
  SyncConfiguration,
  SyncProvider,
  SyncProviderBinding,
  SyncProviderInstanceId,
} from './types';
import { hasCapability } from './types';
import {
  defaultProvider as resolveDefaultProvider,
  enabledBindingsForScope,
  validateSyncConfiguration,
} from './selectionPolicy';

type WithCapability<C extends SyncCapability> = SyncProvider &
  Required<Pick<SyncProvider, C>>;

/**
 * The single place the app composes its sync providers. It owns no transport of
 * its own: it registers providers, answers "who can do X", selects a named
 * provider's capability, and resolves the configured bindings for a scope.
 *
 * Nothing here reads registration order for authority. A default is honoured only
 * when configuration names one; the absence of a default resolves to `undefined`
 * rather than "the first provider".
 */
export interface SyncCoordinator {
  /** Every registered provider, in registration order (order carries no authority). */
  providers: () => SyncProvider[];
  provider: (id: SyncProviderInstanceId) => SyncProvider | undefined;
  /** Every provider offering `capability`, in registration order. */
  providersWith: <C extends SyncCapability>(capability: C) => WithCapability<C>[];
  /**
   * The `capability` object on one *named* provider instance, or `undefined`
   * when that instance is unknown or does not offer it. Explicit selection by id
   * — never "the first capable provider".
   */
  capability: <C extends SyncCapability>(
    id: SyncProviderInstanceId,
    capability: C,
  ) => WithCapability<C>[C] | undefined;
  /**
   * Every provider's `capability` object, for surfaces that aggregate across all
   * providers (a combined status, say) without collapsing to one and discarding
   * the rest.
   */
  capabilities: <C extends SyncCapability>(capability: C) => WithCapability<C>[C][];
  /** The application's default provider, or `undefined` when none is named. */
  defaultProvider: () => SyncProvider | undefined;
  /**
   * Every enabled binding for `scopeId`. Zero when the scope is unbound (an
   * unshared, private scope), one, or several when the scope is bound to several
   * providers at once.
   */
  resolveBindings: (scopeId: AccessScopeId) => SyncProviderBinding[];
}

export const createSyncCoordinator = (options: SyncConfiguration): SyncCoordinator => {
  // Copied once at construction: later mutation of the caller's arrays must not
  // change what this coordinator resolves.
  const config: SyncConfiguration = {
    providers: [...options.providers],
    bindings: [...(options.bindings ?? [])],
    pairingMethods: [...(options.pairingMethods ?? [])],
    defaultProviderInstanceId: options.defaultProviderInstanceId,
    defaultPairingMethodId: options.defaultPairingMethodId,
  };
  validateSyncConfiguration(config);
  const registered = config.providers;

  const capability = <C extends SyncCapability>(
    id: SyncProviderInstanceId,
    name: C,
  ): WithCapability<C>[C] | undefined => {
    const provider = registered.find((candidate) => candidate.id === id);
    if (!provider || !hasCapability(provider, name)) return undefined;
    return provider[name];
  };

  return {
    providers: () => [...registered],
    provider: (id) => registered.find((candidate) => candidate.id === id),
    providersWith: (name) =>
      registered.filter((candidate) => hasCapability(candidate, name)),
    capability,
    capabilities: (name) =>
      registered
        .filter((candidate) => hasCapability(candidate, name))
        .map((candidate) => candidate[name]),
    defaultProvider: () => resolveDefaultProvider(config),
    resolveBindings: (scopeId) => enabledBindingsForScope(config, scopeId),
  };
};

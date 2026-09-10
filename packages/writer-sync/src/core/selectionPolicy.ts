import { invariant } from './invariant';
import type {
  AccessScopeId,
  SyncConfiguration,
  SyncProvider,
  SyncProviderBinding,
  SyncProviderInstanceId,
} from './providers.types';

/**
 * Pure validation and default-selection rules for a {@link SyncConfiguration}.
 *
 * The engine chooses nothing implicitly: a default is honoured only when the
 * application *names* one and that name resolves to a configured provider. No
 * rule here reads registration order, so "the first provider" is never an
 * answer — the absence of a named default resolves to `undefined`, not to
 * whichever provider happens to be first.
 */

const instanceIds = (providers: SyncProvider[]): Set<SyncProviderInstanceId> =>
  new Set(providers.map((provider) => provider.id));

/** Every enabled binding for one scope. Zero, one or several are all valid. */
export const enabledBindingsForScope = (
  config: SyncConfiguration,
  scopeId: AccessScopeId,
): SyncProviderBinding[] =>
  (config.bindings ?? []).filter(
    (binding) => binding.enabled && binding.scopeId === scopeId,
  );

/**
 * The application's default provider instance, or `undefined` when it names
 * none. Never falls back to the first provider — a missing default is a real,
 * reportable state, not something to guess past.
 */
export const defaultProvider = (
  config: SyncConfiguration,
): SyncProvider | undefined => {
  const { defaultProviderInstanceId, providers } = config;
  if (defaultProviderInstanceId === undefined) return undefined;
  return providers.find((provider) => provider.id === defaultProviderInstanceId);
};

/**
 * Reject a configuration that cannot be honoured: duplicate instance ids, or a
 * named default / binding that points at a provider or pairing method which is
 * not configured. Validation is total and order-independent.
 */
export const validateSyncConfiguration = (config: SyncConfiguration): void => {
  const ids = instanceIds(config.providers);
  invariant(
    ids.size === config.providers.length,
    'Duplicate sync provider instance id',
  );

  const { defaultProviderInstanceId } = config;
  invariant(
    defaultProviderInstanceId === undefined || ids.has(defaultProviderInstanceId),
    `Default provider instance is not configured: ${String(defaultProviderInstanceId)}`,
  );

  for (const binding of config.bindings ?? []) {
    invariant(
      ids.has(binding.providerInstanceId),
      `Binding names an unconfigured provider instance: ${binding.providerInstanceId}`,
    );
  }

  const methodIds = new Set((config.pairingMethods ?? []).map((method) => method.id));
  const { defaultPairingMethodId } = config;
  invariant(
    defaultPairingMethodId === undefined || methodIds.has(defaultPairingMethodId),
    `Default pairing method is not configured: ${String(defaultPairingMethodId)}`,
  );
};

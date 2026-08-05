import { describe, expect, it } from 'vitest';
import { InvariantError } from './invariant';
import type { SyncConfiguration, SyncProvider } from './providers.types';
import {
  defaultProvider,
  enabledBindingsForScope,
  validateSyncConfiguration,
} from './selectionPolicy';

const provider = (id: string, kind = id): SyncProvider => ({ id, kind });

const config = (overrides: Partial<SyncConfiguration> = {}): SyncConfiguration => ({
  providers: [provider('a'), provider('b')],
  ...overrides,
});

describe('validateSyncConfiguration', () => {
  it('accepts an empty configuration', () => {
    expect(() => validateSyncConfiguration({ providers: [] })).not.toThrow();
  });

  it('accepts two instances of one provider kind', () => {
    expect(() =>
      validateSyncConfiguration({
        providers: [provider('peer-a', 'webrtc'), provider('peer-b', 'webrtc')],
      }),
    ).not.toThrow();
  });

  it('rejects duplicate instance ids', () => {
    expect(() =>
      validateSyncConfiguration({ providers: [provider('dupe'), provider('dupe')] }),
    ).toThrow(InvariantError);
  });

  it('rejects a default provider that is not configured', () => {
    expect(() =>
      validateSyncConfiguration(config({ defaultProviderInstanceId: 'missing' })),
    ).toThrow(InvariantError);
  });

  it('accepts a default provider that is configured', () => {
    expect(() =>
      validateSyncConfiguration(config({ defaultProviderInstanceId: 'b' })),
    ).not.toThrow();
  });

  it('rejects a binding that names an unconfigured provider', () => {
    expect(() =>
      validateSyncConfiguration(
        config({
          bindings: [{ scopeId: 's', providerInstanceId: 'missing', enabled: true }],
        }),
      ),
    ).toThrow(InvariantError);
  });

  it('rejects a default pairing method that is not configured', () => {
    expect(() =>
      validateSyncConfiguration(config({ defaultPairingMethodId: 'qr' })),
    ).toThrow(InvariantError);
  });

  it('accepts a default pairing method that is configured', () => {
    expect(() =>
      validateSyncConfiguration(
        config({ pairingMethods: [{ id: 'qr', kind: 'qr' }], defaultPairingMethodId: 'qr' }),
      ),
    ).not.toThrow();
  });
});

describe('defaultProvider', () => {
  it('returns undefined when no default is named', () => {
    expect(defaultProvider(config())).toBeUndefined();
  });

  it('never falls back to the first provider', () => {
    expect(defaultProvider({ providers: [provider('a'), provider('b')] })).toBeUndefined();
  });

  it('resolves the named default', () => {
    const resolved = defaultProvider(config({ defaultProviderInstanceId: 'b' }));

    expect(resolved?.id).toBe('b');
  });

  it('returns undefined when the named default is absent', () => {
    expect(
      defaultProvider({ providers: [], defaultProviderInstanceId: 'gone' }),
    ).toBeUndefined();
  });
});

describe('enabledBindingsForScope', () => {
  it('returns nothing when the scope has no bindings', () => {
    expect(enabledBindingsForScope(config(), 'space-1')).toEqual([]);
  });

  it('returns only enabled bindings matching the scope', () => {
    const bindings = [
      { scopeId: 'space-1', providerInstanceId: 'a', enabled: true },
      { scopeId: 'space-1', providerInstanceId: 'b', enabled: false },
      { scopeId: 'space-2', providerInstanceId: 'a', enabled: true },
    ];

    const resolved = enabledBindingsForScope(config({ bindings }), 'space-1');

    expect(resolved.map((binding) => binding.providerInstanceId)).toEqual(['a']);
  });

  it('returns several bindings when a scope is bound to several providers', () => {
    const bindings = [
      { scopeId: 'space-1', providerInstanceId: 'a', enabled: true },
      { scopeId: 'space-1', providerInstanceId: 'b', enabled: true },
    ];

    const resolved = enabledBindingsForScope(config({ bindings }), 'space-1');

    expect(resolved.map((binding) => binding.providerInstanceId)).toEqual(['a', 'b']);
  });
});

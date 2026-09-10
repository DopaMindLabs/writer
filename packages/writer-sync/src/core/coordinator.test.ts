import { describe, expect, it } from 'vitest';
import { InvariantError } from './invariant';
import type { SyncProvider, SyncProviderBinding } from './providers.types';
import { createSyncCoordinator } from './coordinator';

const binding = (
  providerInstanceId: string,
  scopeId = 'space-1',
  enabled = true,
): SyncProviderBinding => ({
  scopeId,
  providerInstanceId,
  externalScopeId: `${providerInstanceId}-realm`,
  enabled,
});

const durableSyncOnly = (id: string, kind = id): SyncProvider => ({
  id,
  kind,
  durableSync: {
    start: () => Promise.resolve(() => undefined),
    requestSync: () => Promise.resolve(),
    status: { subscribe: () => ({ unsubscribe: () => undefined }) },
    syncComplete: { subscribe: () => ({ unsubscribe: () => undefined }) },
  },
});

const keyDeliveryOnly = (id: string): SyncProvider => ({
  id,
  kind: id,
  keyDelivery: {
    setUp: () => Promise.resolve('code'),
    unlock: () => Promise.resolve(),
    recover: () => Promise.resolve(),
    escrowPresence: { subscribe: () => ({ unsubscribe: () => undefined }) },
  },
});

describe('createSyncCoordinator', () => {
  it('registers providers in order', () => {
    const coordinator = createSyncCoordinator({
      providers: [durableSyncOnly('a'), durableSyncOnly('b')],
    });

    expect(coordinator.providers().map((provider) => provider.id)).toEqual(['a', 'b']);
  });

  it('resolves a provider by instance id, and nothing for an unknown id', () => {
    const dexie = durableSyncOnly('dexie-cloud');
    const coordinator = createSyncCoordinator({ providers: [dexie] });

    expect(coordinator.provider('dexie-cloud')).toBe(dexie);
    expect(coordinator.provider('webrtc')).toBeUndefined();
  });

  it('registers two instances of the same provider kind', () => {
    const coordinator = createSyncCoordinator({
      providers: [durableSyncOnly('peer-a', 'webrtc'), durableSyncOnly('peer-b', 'webrtc')],
    });

    expect(coordinator.providers().map((provider) => provider.kind)).toEqual([
      'webrtc',
      'webrtc',
    ]);
    expect(coordinator.provider('peer-a')).not.toBe(coordinator.provider('peer-b'));
  });

  it('rejects duplicate provider instance ids', () => {
    expect(() =>
      createSyncCoordinator({ providers: [durableSyncOnly('dupe'), durableSyncOnly('dupe')] }),
    ).toThrow(InvariantError);
  });

  it('ignores later mutation of the caller’s provider array', () => {
    const providers = [durableSyncOnly('a')];
    const coordinator = createSyncCoordinator({ providers });

    providers.push(durableSyncOnly('b'));

    expect(coordinator.providers().map((provider) => provider.id)).toEqual(['a']);
    expect(coordinator.provider('b')).toBeUndefined();
  });

  it('does not expose its registry for mutation', () => {
    const coordinator = createSyncCoordinator({ providers: [durableSyncOnly('a')] });

    coordinator.providers().push(durableSyncOnly('b'));

    expect(coordinator.providers()).toHaveLength(1);
  });

  it('lists every provider offering a capability', () => {
    const coordinator = createSyncCoordinator({
      providers: [durableSyncOnly('a'), keyDeliveryOnly('b'), durableSyncOnly('c')],
    });

    expect(coordinator.providersWith('durableSync').map((provider) => provider.id)).toEqual([
      'a',
      'c',
    ]);
    expect(coordinator.providersWith('keyDelivery').map((provider) => provider.id)).toEqual([
      'b',
    ]);
    expect(coordinator.providersWith('realtime')).toEqual([]);
  });

  it('supports an empty provider list', () => {
    const coordinator = createSyncCoordinator({ providers: [] });

    expect(coordinator.providers()).toEqual([]);
    expect(coordinator.provider('anything')).toBeUndefined();
    expect(coordinator.providersWith('durableSync')).toEqual([]);
  });
});

describe('explicit capability selection', () => {
  it('selects a capability from a named provider instance', () => {
    const a = durableSyncOnly('a');
    const b = keyDeliveryOnly('b');
    const coordinator = createSyncCoordinator({ providers: [a, b] });

    expect(coordinator.capability('a', 'durableSync')).toBe(a.durableSync);
    expect(coordinator.capability('b', 'keyDelivery')).toBe(b.keyDelivery);
  });

  it('returns undefined for a named instance that does not offer the capability', () => {
    const coordinator = createSyncCoordinator({ providers: [durableSyncOnly('a')] });

    expect(coordinator.capability('a', 'keyDelivery')).toBeUndefined();
    expect(coordinator.capability('unknown', 'durableSync')).toBeUndefined();
  });

  it('aggregates a capability across every provider that offers it', () => {
    const a = durableSyncOnly('a');
    const c = durableSyncOnly('c');
    const coordinator = createSyncCoordinator({
      providers: [a, keyDeliveryOnly('b'), c],
    });

    expect(coordinator.capabilities('durableSync')).toEqual([a.durableSync, c.durableSync]);
    expect(coordinator.capabilities('realtime')).toEqual([]);
  });
});

describe('default provider selection', () => {
  it('never treats the first provider as the default', () => {
    const coordinator = createSyncCoordinator({
      providers: [durableSyncOnly('a'), durableSyncOnly('b')],
    });

    expect(coordinator.defaultProvider()).toBeUndefined();
  });

  it('resolves the configured default by instance id', () => {
    const b = durableSyncOnly('b');
    const coordinator = createSyncCoordinator({
      providers: [durableSyncOnly('a'), b],
      defaultProviderInstanceId: 'b',
    });

    expect(coordinator.defaultProvider()).toBe(b);
  });

  it('rejects a default that names an unconfigured provider', () => {
    expect(() =>
      createSyncCoordinator({
        providers: [durableSyncOnly('a')],
        defaultProviderInstanceId: 'missing',
      }),
    ).toThrow(InvariantError);
  });
});

describe('binding resolution', () => {
  it('resolves nothing for a scope with no bindings', () => {
    const coordinator = createSyncCoordinator({ providers: [durableSyncOnly('a')] });

    expect(coordinator.resolveBindings('space-1')).toEqual([]);
  });

  it('resolves the one enabled binding for a scope', () => {
    const coordinator = createSyncCoordinator({
      providers: [durableSyncOnly('a')],
      bindings: [binding('a')],
    });

    expect(coordinator.resolveBindings('space-1').map((b) => b.providerInstanceId)).toEqual([
      'a',
    ]);
  });

  it('resolves several enabled bindings for one scope', () => {
    const coordinator = createSyncCoordinator({
      providers: [durableSyncOnly('a'), durableSyncOnly('b')],
      bindings: [binding('a'), binding('b')],
    });

    expect(coordinator.resolveBindings('space-1').map((b) => b.providerInstanceId)).toEqual([
      'a',
      'b',
    ]);
  });

  it('omits disabled bindings and bindings for other scopes', () => {
    const coordinator = createSyncCoordinator({
      providers: [durableSyncOnly('a'), durableSyncOnly('b')],
      bindings: [binding('a'), binding('b', 'space-1', false), binding('a', 'space-2')],
    });

    expect(coordinator.resolveBindings('space-1').map((b) => b.providerInstanceId)).toEqual([
      'a',
    ]);
  });

  it('rejects a binding that names an unconfigured provider', () => {
    expect(() =>
      createSyncCoordinator({
        providers: [durableSyncOnly('a')],
        bindings: [binding('missing')],
      }),
    ).toThrow(InvariantError);
  });
});

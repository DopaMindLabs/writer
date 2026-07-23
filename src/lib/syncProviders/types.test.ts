import { describe, expect, it, vi } from 'vitest';
import type { SyncTransport } from '@/lib/collab/types';
import type { CloudObservable } from '@/lib/cloud/cloudObservable';
import type {
  SyncConfiguration,
  SyncObservable,
  SyncProvider,
  SyncProviderBinding,
} from './types';
import { KeyEscrowPresence, hasCapability } from './types';

/** A provider offering only what Dexie Cloud can do today. */
const durableSyncProvider = (): SyncProvider => ({
  id: 'dexie-cloud',
  kind: 'dexie-cloud',
  durableSync: {
    start: () => Promise.resolve(() => undefined),
    requestSync: () => Promise.resolve(),
    status: { subscribe: () => ({ unsubscribe: () => undefined }) },
    syncComplete: { subscribe: () => ({ unsubscribe: () => undefined }) },
  },
});

const transport = (): SyncTransport => ({
  send: () => undefined,
  onMessage: () => () => undefined,
  close: () => undefined,
  sharesStore: false,
});

/** A provider offering only what a peer transport can do. */
const realtimeProvider = (): SyncProvider => ({
  id: 'webrtc',
  kind: 'webrtc',
  realtime: {
    createTransport: () => Promise.resolve(transport()),
  },
  discovery: {
    register: () => Promise.resolve(),
    release: () => Promise.resolve(),
    peers: { subscribe: () => ({ unsubscribe: () => undefined }) },
  },
});

describe('SyncProvider capabilities', () => {
  it('accepts a provider that offers no capabilities at all', () => {
    const provider: SyncProvider = { id: 'local-folder', kind: 'local-folder' };

    expect(hasCapability(provider, 'durableSync')).toBe(false);
    expect(hasCapability(provider, 'realtime')).toBe(false);
    expect(hasCapability(provider, 'discovery')).toBe(false);
    expect(hasCapability(provider, 'accessControl')).toBe(false);
    expect(hasCapability(provider, 'keyDelivery')).toBe(false);
  });

  it('reports only the capabilities a durable-sync provider declares', () => {
    const provider = durableSyncProvider();

    expect(hasCapability(provider, 'durableSync')).toBe(true);
    expect(hasCapability(provider, 'realtime')).toBe(false);
    expect(hasCapability(provider, 'accessControl')).toBe(false);
  });

  it('reports only the capabilities a peer provider declares', () => {
    const provider = realtimeProvider();

    expect(hasCapability(provider, 'realtime')).toBe(true);
    expect(hasCapability(provider, 'discovery')).toBe(true);
    expect(hasCapability(provider, 'durableSync')).toBe(false);
  });

  it('narrows the capability so callers need no second check', async () => {
    const provider = durableSyncProvider();

    // Compiles only because the guard narrows: no optional-chaining, no cast.
    if (!hasCapability(provider, 'durableSync')) {
      expect.unreachable('durableSync was declared');
      return;
    }
    await expect(provider.durableSync.requestSync()).resolves.toBeUndefined();
  });

  it('start resolves with a teardown that stops what it started', async () => {
    const stop = vi.fn();
    const provider: SyncProvider = {
      id: 'test',
      kind: 'test',
      durableSync: {
        start: () => Promise.resolve(stop),
        requestSync: () => Promise.resolve(),
        status: { subscribe: () => ({ unsubscribe: () => undefined }) },
        syncComplete: { subscribe: () => ({ unsubscribe: () => undefined }) },
      },
    };

    if (!hasCapability(provider, 'durableSync')) {
      expect.unreachable('durableSync was declared');
      return;
    }
    const teardown = await provider.durableSync.start();
    teardown();

    expect(stop).toHaveBeenCalledOnce();
  });

  it('creates a realtime transport per scope and channel, not per provider', async () => {
    const provider = realtimeProvider();

    if (!hasCapability(provider, 'realtime')) {
      expect.unreachable('realtime was declared');
      return;
    }
    const made = await provider.realtime.createTransport({
      accessScopeId: 'space-1',
      channelId: 'doc-1',
    });

    expect(made.sharesStore).toBe(false);
  });
});

describe('SyncProvider instances', () => {
  it('allows two configured instances of one provider kind', () => {
    const first: SyncProvider = { id: 'peer-a', kind: 'webrtc' };
    const second: SyncProvider = { id: 'peer-b', kind: 'webrtc' };

    expect(first.kind).toBe(second.kind);
    expect(first.id).not.toBe(second.id);
  });
});

describe('SyncObservable', () => {
  it('is satisfied structurally by a cloud observable, with no cast', () => {
    // The compile-time point of this test: the cloud subsystem's observable is
    // assignable to the sync layer's without either module importing the other.
    const cloudEscrow: CloudObservable<KeyEscrowPresence> = {
      subscribe: (next) => {
        next(KeyEscrowPresence.Present);
        return { unsubscribe: () => undefined };
      },
    };
    const asSyncObservable: SyncObservable<KeyEscrowPresence> = cloudEscrow;

    const seen: KeyEscrowPresence[] = [];
    const subscription = asSyncObservable.subscribe((value) => {
      seen.push(value);
    });
    subscription.unsubscribe();

    expect(seen).toEqual([KeyEscrowPresence.Present]);
  });

  it('unsubscribes through the returned handle', () => {
    const unsubscribe = vi.fn();
    const observable: SyncObservable<number> = {
      subscribe: () => ({ unsubscribe }),
    };

    observable.subscribe(() => undefined).unsubscribe();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe('SyncProviderBinding', () => {
  it('keeps the application scope id separate from the provider-side id', () => {
    const binding: SyncProviderBinding = {
      scopeId: 'space-1',
      providerInstanceId: 'dexie-cloud',
      externalScopeId: 'rlm-abc',
      enabled: true,
    };

    expect(binding.scopeId).not.toBe(binding.externalScopeId);
  });
});

describe('SyncConfiguration', () => {
  it('describes an application configured with several providers and a default', () => {
    const config: SyncConfiguration = {
      providers: [durableSyncProvider(), realtimeProvider()],
      bindings: [],
      defaultProviderInstanceId: 'dexie-cloud',
      pairingMethods: [{ id: 'qr', kind: 'qr' }],
      defaultPairingMethodId: 'qr',
    };

    expect(config.providers.map((provider) => provider.id)).toEqual([
      'dexie-cloud',
      'webrtc',
    ]);
    expect(config.defaultProviderInstanceId).toBe('dexie-cloud');
  });

  it('is valid with no providers, bindings, defaults or pairing methods', () => {
    const config: SyncConfiguration = { providers: [] };

    expect(config.providers).toEqual([]);
    expect(config.defaultProviderInstanceId).toBeUndefined();
  });
});

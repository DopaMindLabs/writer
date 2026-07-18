import { describe, expect, it, vi } from 'vitest';
import type { CloudObservable } from '@/lib/cloud/cloudObservable';
import type {
  KeyEscrowPresence,
  SyncObservable,
  SyncProvider,
  SyncProviderBinding,
  WriterSyncOptions,
} from './types';
import { hasCapability } from './types';

/** A provider offering only what Dexie Cloud can do today. */
const frameSyncProvider = (): SyncProvider => ({
  id: 'dexie-cloud',
  frameSync: {
    start: () => Promise.resolve(() => undefined),
    requestSync: () => Promise.resolve(),
    status: { subscribe: () => ({ unsubscribe: () => undefined }) },
    syncComplete: { subscribe: () => ({ unsubscribe: () => undefined }) },
  },
});

/** A provider offering only what a peer transport can do. */
const realtimeProvider = (): SyncProvider => ({
  id: 'webrtc',
  realtime: {
    send: () => undefined,
    onMessage: () => () => undefined,
    close: () => undefined,
    sharesStore: false,
  },
  discovery: {
    register: () => Promise.resolve(),
    release: () => Promise.resolve(),
    peers: { subscribe: () => ({ unsubscribe: () => undefined }) },
  },
});

describe('SyncProvider capabilities', () => {
  it('accepts a provider that offers no capabilities at all', () => {
    const provider: SyncProvider = { id: 'local-folder' };

    expect(hasCapability(provider, 'frameSync')).toBe(false);
    expect(hasCapability(provider, 'realtime')).toBe(false);
    expect(hasCapability(provider, 'discovery')).toBe(false);
    expect(hasCapability(provider, 'accessControl')).toBe(false);
    expect(hasCapability(provider, 'keyDelivery')).toBe(false);
  });

  it('reports only the capabilities a durable-sync provider declares', () => {
    const provider = frameSyncProvider();

    expect(hasCapability(provider, 'frameSync')).toBe(true);
    expect(hasCapability(provider, 'realtime')).toBe(false);
    expect(hasCapability(provider, 'accessControl')).toBe(false);
  });

  it('reports only the capabilities a peer provider declares', () => {
    const provider = realtimeProvider();

    expect(hasCapability(provider, 'realtime')).toBe(true);
    expect(hasCapability(provider, 'discovery')).toBe(true);
    expect(hasCapability(provider, 'frameSync')).toBe(false);
  });

  it('narrows the capability so callers need no second check', async () => {
    const provider = frameSyncProvider();

    // Compiles only because the guard narrows: no optional-chaining, no cast.
    if (!hasCapability(provider, 'frameSync')) {
      expect.unreachable('frameSync was declared');
      return;
    }
    await expect(provider.frameSync.requestSync()).resolves.toBeUndefined();
  });

  it('start resolves with a teardown that stops what it started', async () => {
    const stop = vi.fn();
    const provider: SyncProvider = {
      id: 'test',
      frameSync: {
        start: () => Promise.resolve(stop),
        requestSync: () => Promise.resolve(),
        status: { subscribe: () => ({ unsubscribe: () => undefined }) },
        syncComplete: { subscribe: () => ({ unsubscribe: () => undefined }) },
      },
    };

    if (!hasCapability(provider, 'frameSync')) {
      expect.unreachable('frameSync was declared');
      return;
    }
    const teardown = await provider.frameSync.start();
    teardown();

    expect(stop).toHaveBeenCalledOnce();
  });
});

describe('SyncObservable', () => {
  it('is satisfied structurally by a cloud observable, with no cast', () => {
    // The compile-time point of this test: the cloud subsystem's observable is
    // assignable to the sync layer's without either module importing the other.
    const cloudEscrow: CloudObservable<KeyEscrowPresence> = {
      subscribe: (next) => {
        next('present');
        return { unsubscribe: () => undefined };
      },
    };
    const asSyncObservable: SyncObservable<KeyEscrowPresence> = cloudEscrow;

    const seen: KeyEscrowPresence[] = [];
    const subscription = asSyncObservable.subscribe((value) => seen.push(value));
    subscription.unsubscribe();

    expect(seen).toEqual(['present']);
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
      providerId: 'dexie-cloud',
      externalScopeId: 'rlm-abc',
      enabled: true,
    };

    expect(binding.scopeId).not.toBe(binding.externalScopeId);
  });

  it('describes a coordinator configured with several providers', () => {
    const options: WriterSyncOptions = {
      providers: [frameSyncProvider(), realtimeProvider()],
    };

    expect(options.providers.map((provider) => provider.id)).toEqual([
      'dexie-cloud',
      'webrtc',
    ]);
  });
});

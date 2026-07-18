import { describe, it, expect } from 'vitest';
import type { SyncProvider, SyncProviderBinding, WriterSyncOptions, SyncProviderId, AccessScopeId } from './types';
import { hasCapability } from './types';
import type { SyncTransport } from '@/lib/collab/types';

const toSyncProviderId = (s: string): SyncProviderId => s as SyncProviderId;
const toAccessScopeId = (s: string): AccessScopeId => s as AccessScopeId;

describe('SyncProvider contracts', () => {
  it('minimal dexie-cloud-shaped provider satisfies SyncProvider', () => {
    const dexieCloudProvider: SyncProvider = {
      id: toSyncProviderId('dexie-cloud'),
      frameSync: {
        start: () => Promise.resolve(() => {}),
        stop: () => Promise.resolve(),
        requestSync: () => Promise.resolve(),
        syncState: () => ({ phase: 'synced' }),
        onSyncComplete: () => () => {},
      },
      keyDelivery: {
        createEncryption: () => Promise.resolve({}),
        unlockEncryption: () => Promise.resolve(),
        recoverEncryption: () => Promise.resolve(),
        escrowPresence: () => ({ state: 'present' }),
      },
    };
    expect(dexieCloudProvider.id).toBe('dexie-cloud');
  });

  it('minimal webrtc-shaped provider satisfies SyncProvider', () => {
    const webrtcProvider: SyncProvider = {
      id: toSyncProviderId('webrtc-p2p'),
      realtime: {
        send: () => {},
        onMessage: () => () => {},
        close: () => {},
        sharesStore: false,
      } satisfies SyncTransport,
      discovery: {
        registerPeer: () => Promise.resolve(),
        releasePeer: () => Promise.resolve(),
        listPeers: () => Promise.resolve([]),
      },
    };
    expect(webrtcProvider.id).toBe('webrtc-p2p');
  });

  it('hasCapability type guard works', () => {
    const provider: SyncProvider = {
      id: toSyncProviderId('test'),
      frameSync: {
        start: () => Promise.resolve(() => {}),
        stop: () => Promise.resolve(),
        requestSync: () => Promise.resolve(),
        syncState: () => ({ phase: 'synced' }),
        onSyncComplete: () => () => {},
      },
    };

    expect(hasCapability(provider, 'frameSync')).toBe(true);
    expect(hasCapability(provider, 'realtime')).toBe(false);
    expect(hasCapability(provider, 'discovery')).toBe(false);
    expect(hasCapability(provider, 'accessControl')).toBe(false);
    expect(hasCapability(provider, 'keyDelivery')).toBe(false);
  });

  it('hasCapability with multiple capabilities', () => {
    const provider: SyncProvider = {
      id: toSyncProviderId('multi'),
      frameSync: {
        start: () => Promise.resolve(() => {}),
        stop: () => Promise.resolve(),
        requestSync: () => Promise.resolve(),
        syncState: () => ({ phase: 'synced' }),
        onSyncComplete: () => () => {},
      },
      keyDelivery: {
        createEncryption: () => Promise.resolve({}),
        unlockEncryption: () => Promise.resolve(),
        recoverEncryption: () => Promise.resolve(),
        escrowPresence: () => ({ state: 'present' }),
      },
    };

    expect(hasCapability(provider, 'frameSync')).toBe(true);
    expect(hasCapability(provider, 'keyDelivery')).toBe(true);
    expect(hasCapability(provider, 'accessControl')).toBe(false);
  });

  it('SyncProviderBinding types round-trip', () => {
    const binding: SyncProviderBinding = {
      scopeId: toAccessScopeId('space-123'),
      providerId: toSyncProviderId('dexie-cloud'),
      externalScopeId: 'realm-456',
      enabled: true,
    };
    expect(binding.scopeId).toBe('space-123');
  });

  it('WriterSyncOptions accepts provider array', () => {
    const options: WriterSyncOptions = {
      providers: [
        { id: toSyncProviderId('dexie-cloud') },
        { id: toSyncProviderId('webrtc-p2p') },
      ],
    };
    expect(options.providers).toHaveLength(2);
  });
});

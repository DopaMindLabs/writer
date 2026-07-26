import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncState } from 'dexie-cloud-addon';
import type { CloudObservable } from './cloudObservable';
import type { EscrowPresence } from './cloudClient';
import type { SyncStatus } from '@/lib/syncProviders/types';
import { KeyEscrowPresence, SyncPhase, hasCapability } from '@/lib/syncProviders/types';
import { createDexieCloudProvider } from './dexieCloudProvider';

vi.mock('./cloudClient', () => ({
  startCloudSession: vi.fn(),
  requestCloudSync: vi.fn(),
  cloudSyncState: vi.fn(),
  cloudSyncComplete: vi.fn(),
  cloudEscrowPresence: vi.fn(),
  createCloudEncryption: vi.fn(),
  unlockCloudEncryption: vi.fn(),
  recoverCloudEncryption: vi.fn(),
}));

import {
  cloudEscrowPresence,
  cloudSyncComplete,
  cloudSyncState,
  createCloudEncryption,
  recoverCloudEncryption,
  requestCloudSync,
  startCloudSession,
  unlockCloudEncryption,
} from './cloudClient';

/** An observable that replays one fixed value, like the facade's no-cloud fallback. */
const constant = <T,>(value: T): CloudObservable<T> => ({
  subscribe: (next) => {
    next(value);
    return { unsubscribe: () => undefined };
  },
});

const syncState = (phase: SyncState['phase']): SyncState =>
  ({ status: 'connected', phase }) as SyncState;

/** Drive the provider's status observable once and return what it emitted. */
const emittedStatus = (phase: SyncState['phase']): SyncStatus | undefined => {
  vi.mocked(cloudSyncState).mockReturnValue(constant(syncState(phase)));
  const provider = createDexieCloudProvider();
  let seen: SyncStatus | undefined;
  provider.durableSync?.status.subscribe((status) => {
    seen = status;
  });
  return seen;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cloudSyncState).mockReturnValue(constant(syncState('in-sync')));
  vi.mocked(cloudSyncComplete).mockReturnValue(constant(undefined));
  vi.mocked(startCloudSession).mockResolvedValue(() => undefined);
  vi.mocked(requestCloudSync).mockResolvedValue(undefined);
  vi.mocked(cloudEscrowPresence).mockReturnValue(constant('none'));
  vi.mocked(createCloudEncryption).mockResolvedValue('recovery-code');
  vi.mocked(unlockCloudEncryption).mockResolvedValue(undefined);
  vi.mocked(recoverCloudEncryption).mockResolvedValue(undefined);
});

describe('createDexieCloudProvider', () => {
  it('declares the capabilities Dexie Cloud serves today', () => {
    const provider = createDexieCloudProvider();

    expect(provider.id).toBe('dexie-cloud');
    expect(provider.kind).toBe('dexie-cloud');
    expect(hasCapability(provider, 'durableSync')).toBe(true);
    expect(hasCapability(provider, 'keyDelivery')).toBe(true);
  });

  it('declares access control, but no realtime or discovery', () => {
    const provider = createDexieCloudProvider();

    // Realm-backed scope and membership control lives behind the adapter; the
    // addon has no realtime transport or peer discovery of its own.
    expect(hasCapability(provider, 'accessControl')).toBe(true);
    expect(hasCapability(provider, 'realtime')).toBe(false);
    expect(hasCapability(provider, 'discovery')).toBe(false);
  });
});

describe('durableSync', () => {
  it('starts the cloud session and passes its teardown through', async () => {
    const stop = vi.fn();
    vi.mocked(startCloudSession).mockResolvedValue(stop);
    const provider = createDexieCloudProvider();

    const teardown = await provider.durableSync?.start();
    teardown?.();

    expect(startCloudSession).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledOnce();
  });

  it('delegates a sync request to the facade', async () => {
    const provider = createDexieCloudProvider();

    await provider.durableSync?.requestSync();

    expect(requestCloudSync).toHaveBeenCalledOnce();
  });

  it('propagates a failed sync request rather than swallowing it', async () => {
    const failure = new Error('offline');
    vi.mocked(requestCloudSync).mockRejectedValue(failure);
    const provider = createDexieCloudProvider();

    await expect(provider.durableSync?.requestSync()).rejects.toThrow(failure);
  });

  it('relays each settled sync round', () => {
    const subscribers: (() => void)[] = [];
    vi.mocked(cloudSyncComplete).mockReturnValue({
      subscribe: (next) => {
        subscribers.push(next);
        return { unsubscribe: () => undefined };
      },
    });
    const provider = createDexieCloudProvider();
    const onComplete = vi.fn();

    provider.durableSync?.syncComplete.subscribe(onComplete);
    subscribers.forEach((notify) => notify());

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('unsubscribes from the underlying status observable', () => {
    const unsubscribe = vi.fn();
    vi.mocked(cloudSyncState).mockReturnValue({
      subscribe: () => ({ unsubscribe }),
    });
    const provider = createDexieCloudProvider();

    provider.durableSync?.status.subscribe(() => undefined).unsubscribe();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe('status phase mapping', () => {
  it.each<[SyncState['phase'], SyncPhase]>([
    ['initial', SyncPhase.Initial],
    ['not-in-sync', SyncPhase.Pending],
    ['pushing', SyncPhase.Pushing],
    ['pulling', SyncPhase.Pulling],
    ['in-sync', SyncPhase.InSync],
    ['offline', SyncPhase.Offline],
    ['error', SyncPhase.Error],
  ])('maps the addon phase %s onto %s', (addonPhase, expected) => {
    expect(emittedStatus(addonPhase)?.phase).toBe(expected);
  });

  it('carries the error through on a failed round', () => {
    const error = new Error('sync failed');
    vi.mocked(cloudSyncState).mockReturnValue(
      constant({ status: 'error', phase: 'error', error } as SyncState),
    );
    const provider = createDexieCloudProvider();

    let seen: SyncStatus | undefined;
    provider.durableSync?.status.subscribe((status) => {
      seen = status;
    });

    expect(seen?.error).toBe(error);
  });
});

describe('keyDelivery', () => {
  it('sets up with the passphrase and returns the recovery code', async () => {
    const provider = createDexieCloudProvider();

    await expect(provider.keyDelivery?.setUp('correct horse')).resolves.toBe('recovery-code');
    expect(createCloudEncryption).toHaveBeenCalledWith('correct horse');
  });

  it('unlocks with the passphrase', async () => {
    const provider = createDexieCloudProvider();

    await provider.keyDelivery?.unlock('correct horse');

    expect(unlockCloudEncryption).toHaveBeenCalledWith('correct horse');
  });

  it('recovers with the recovery code', async () => {
    const provider = createDexieCloudProvider();

    await provider.keyDelivery?.recover('ABCD-EFGH');

    expect(recoverCloudEncryption).toHaveBeenCalledWith('ABCD-EFGH');
  });

  it('propagates a wrong passphrase rather than reporting success', async () => {
    const failure = new Error('wrong passphrase');
    vi.mocked(unlockCloudEncryption).mockRejectedValue(failure);
    const provider = createDexieCloudProvider();

    await expect(provider.keyDelivery?.unlock('nope')).rejects.toThrow(failure);
  });

  it.each<[EscrowPresence, KeyEscrowPresence]>([
    ['unknown', KeyEscrowPresence.Unknown],
    ['none', KeyEscrowPresence.None],
    ['present', KeyEscrowPresence.Present],
  ])('maps escrow presence %s onto %s', (facadeValue, expected) => {
    vi.mocked(cloudEscrowPresence).mockReturnValue(constant(facadeValue));
    const provider = createDexieCloudProvider();

    const seen: KeyEscrowPresence[] = [];
    provider.keyDelivery?.escrowPresence.subscribe((value) => {
      seen.push(value);
    });

    expect(seen).toEqual([expected]);
  });
});

describe('accessControl binding resolution', () => {
  it('resolves nothing for an unknown space', async () => {
    const provider = createDexieCloudProvider();
    await expect(
      provider.accessControl?.resolveBinding('missing-space'),
    ).resolves.toBeUndefined();
  });

  it('resolves nothing for an unshared (private-realm) space', async () => {
    const { db } = await import('@/db/db');
    const { sampleSpace } = await import('@/test/fixtures');
    // No binding row: the scope was never moved out of the private realm.
    await db.spaces.put({ ...sampleSpace, id: 'private-space' });
    const provider = createDexieCloudProvider();

    await expect(
      provider.accessControl?.resolveBinding('private-space'),
    ).resolves.toBeUndefined();
  });

  it('maps a scope onto its realm through the persisted binding, not a domain row', async () => {
    const { db } = await import('@/db/db');
    const { sampleSpace } = await import('@/test/fixtures');
    // No domain row carries a realm since the frame cutover: the binding is
    // adapter state the scope transition wrote.
    await db.spaces.put({ ...sampleSpace, id: 'shared-space' });
    await db.syncProviderBindings.put({
      scopeId: 'shared-space',
      providerInstanceId: 'dexie-cloud',
      externalScopeId: 'rlm-shared',
      enabled: true,
    });
    const provider = createDexieCloudProvider();

    const binding = await provider.accessControl?.resolveBinding('shared-space');

    expect(binding).toEqual({
      scopeId: 'shared-space',
      providerInstanceId: 'dexie-cloud',
      externalScopeId: 'rlm-shared',
      enabled: true,
    });
    expect(await db.spaces.get('shared-space')).not.toHaveProperty('realmId');
  });
});

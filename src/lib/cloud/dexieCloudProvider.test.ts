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
  provider.frameSync?.status.subscribe((status) => {
    seen = status;
  });
  return seen;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cloudSyncState).mockReturnValue(constant(syncState('in-sync')));
  vi.mocked(cloudSyncComplete).mockReturnValue(constant(undefined));
  vi.mocked(cloudEscrowPresence).mockReturnValue(constant('none'));
  vi.mocked(startCloudSession).mockResolvedValue(() => undefined);
  vi.mocked(requestCloudSync).mockResolvedValue(undefined);
  vi.mocked(createCloudEncryption).mockResolvedValue('recovery-code');
  vi.mocked(unlockCloudEncryption).mockResolvedValue(undefined);
  vi.mocked(recoverCloudEncryption).mockResolvedValue(undefined);
});

describe('createDexieCloudProvider', () => {
  it('declares the capabilities Dexie Cloud actually has', () => {
    const provider = createDexieCloudProvider();

    expect(provider.id).toBe('dexie-cloud');
    expect(hasCapability(provider, 'frameSync')).toBe(true);
    expect(hasCapability(provider, 'keyDelivery')).toBe(true);
  });

  it('declares no capability it cannot yet serve', () => {
    const provider = createDexieCloudProvider();

    // Access control arrives with the realm tables; the addon offers no
    // realtime transport or peer discovery of its own.
    expect(hasCapability(provider, 'accessControl')).toBe(false);
    expect(hasCapability(provider, 'realtime')).toBe(false);
    expect(hasCapability(provider, 'discovery')).toBe(false);
  });
});

describe('frameSync', () => {
  it('starts the cloud session and passes its teardown through', async () => {
    const stop = vi.fn();
    vi.mocked(startCloudSession).mockResolvedValue(stop);
    const provider = createDexieCloudProvider();

    const teardown = await provider.frameSync?.start();
    teardown?.();

    expect(startCloudSession).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledOnce();
  });

  it('delegates a sync request to the facade', async () => {
    const provider = createDexieCloudProvider();

    await provider.frameSync?.requestSync();

    expect(requestCloudSync).toHaveBeenCalledOnce();
  });

  it('propagates a failed sync request rather than swallowing it', async () => {
    const failure = new Error('offline');
    vi.mocked(requestCloudSync).mockRejectedValue(failure);
    const provider = createDexieCloudProvider();

    await expect(provider.frameSync?.requestSync()).rejects.toThrow(failure);
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

    provider.frameSync?.syncComplete.subscribe(onComplete);
    subscribers.forEach((notify) => notify());

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('unsubscribes from the underlying status observable', () => {
    const unsubscribe = vi.fn();
    vi.mocked(cloudSyncState).mockReturnValue({
      subscribe: () => ({ unsubscribe }),
    });
    const provider = createDexieCloudProvider();

    provider.frameSync?.status.subscribe(() => undefined).unsubscribe();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe('status phase mapping', () => {
  it.each<[SyncState['phase'], SyncPhase]>([
    ['initial', SyncPhase.Initial],
    ['not-in-sync', SyncPhase.Pending],
    ['pushing', SyncPhase.Syncing],
    ['pulling', SyncPhase.Syncing],
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
    provider.frameSync?.status.subscribe((status) => {
      seen = status;
    });

    expect(seen?.error).toBe(error);
  });
});

describe('keyDelivery', () => {
  it('sets up encryption with the passphrase and returns the recovery code', async () => {
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

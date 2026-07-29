import { describe, expect, it, vi } from 'vitest';
import { createSyncCoordinator } from 'writer-sync/core';
import type { SyncProvider } from 'writer-sync/core';
import { appLogger } from '@/lib/appLogger';
import { compactJournal } from './materialization/compactJournal';
import { startWriterSync } from './startWriterSync';

vi.mock('./materialization/compactJournal', () => ({
  compactJournal: vi.fn(() => Promise.resolve()),
}));

vi.mock('./hydrateDeviceKeys', () => ({
  hydrateDeviceKeys: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/cloud/cloudClient', () => ({
  startCloudSession: vi.fn().mockResolvedValue(() => undefined),
  requestCloudSync: vi.fn(),
  cloudSyncState: vi.fn(),
  cloudSyncComplete: vi.fn(() => ({ subscribe: () => ({ unsubscribe: () => undefined }) })),
  cloudEscrowPresence: vi.fn(),
  createCloudEncryption: vi.fn(),
  unlockCloudEncryption: vi.fn(),
  recoverCloudEncryption: vi.fn(),
}));

import { startCloudSession } from '@/lib/cloud/cloudClient';
import { hydrateDeviceKeys } from './hydrateDeviceKeys';

const durableSyncProvider = (id: string, start: () => Promise<() => void>): SyncProvider => ({
  id,
  kind: id,
  durableSync: {
    start,
    requestSync: () => Promise.resolve(),
    status: { subscribe: () => ({ unsubscribe: () => undefined }) },
    syncComplete: { subscribe: () => ({ unsubscribe: () => undefined }) },
  },
});

const realtimeOnlyProvider = (id: string): SyncProvider => ({
  id,
  kind: id,
  realtime: {
    createTransport: () =>
      Promise.resolve({
        send: () => undefined,
        onMessage: () => () => undefined,
        close: () => undefined,
        sharesStore: false,
      }),
  },
});

const coordinatorOf = (...providers: SyncProvider[]) => createSyncCoordinator({ providers });

describe('startWriterSync', () => {
  it('hydrates this device’s key ring before any provider starts', async () => {
    // A device acquires key material two ways: by minting the account, or by
    // being handed the account root over a pairing. Only the first used to
    // rehydrate on boot, so a paired device came back keyless and every sealed
    // row was silently dropped from every read. Hydration belongs to boot, not
    // to whichever provider happens to be configured.
    const order: string[] = [];
    vi.mocked(hydrateDeviceKeys).mockImplementation(async () => {
      order.push('hydrate');
    });
    const provider = durableSyncProvider('p', async () => {
      order.push('provider');
      return () => undefined;
    });

    await startWriterSync(coordinatorOf(provider));

    expect(order).toEqual(['hydrate', 'provider']);
  });

  it('hydrates even when no provider offers durable sync at all', async () => {
    // The pairing-only device: no Dexie Cloud, nothing to start — and it is
    // exactly the device that used to lose its keys.
    vi.mocked(hydrateDeviceKeys).mockClear();

    await startWriterSync(coordinatorOf(realtimeOnlyProvider('peer')));

    expect(hydrateDeviceKeys).toHaveBeenCalledTimes(1);
  });

  it('starts Dexie Cloud when no coordinator is supplied', async () => {
    const stop = await startWriterSync();

    expect(startCloudSession).toHaveBeenCalledOnce();
    stop();
  });

  it('starts every provider that offers durable sync', async () => {
    const first = vi.fn().mockResolvedValue(() => undefined);
    const second = vi.fn().mockResolvedValue(() => undefined);

    await startWriterSync(
      coordinatorOf(durableSyncProvider('a', first), durableSyncProvider('b', second)),
    );

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('leaves a realtime-only provider alone — it is per-document, not per-session', async () => {
    const start = vi.fn().mockResolvedValue(() => undefined);

    const stop = await startWriterSync(
      coordinatorOf(realtimeOnlyProvider('webrtc'), durableSyncProvider('cloud', start)),
    );
    stop();

    expect(start).toHaveBeenCalledOnce();
  });

  it('tears every started provider down through one teardown', async () => {
    const stopFirst = vi.fn();
    const stopSecond = vi.fn();

    const stop = await startWriterSync(
      coordinatorOf(
        durableSyncProvider('a', () => Promise.resolve(stopFirst)),
        durableSyncProvider('b', () => Promise.resolve(stopSecond)),
      ),
    );
    stop();

    expect(stopFirst).toHaveBeenCalledOnce();
    expect(stopSecond).toHaveBeenCalledOnce();
  });

  it('propagates a provider that fails to start', async () => {
    const failure = new Error('cloud unreachable');

    await expect(
      startWriterSync(coordinatorOf(durableSyncProvider('a', () => Promise.reject(failure)))),
    ).rejects.toThrow(failure);
  });

  it('tears down already-started providers when a later one fails', async () => {
    const stopFirst = vi.fn();
    const failure = new Error('second provider unreachable');

    await expect(
      startWriterSync(
        coordinatorOf(
          durableSyncProvider('a', () => Promise.resolve(stopFirst)),
          durableSyncProvider('b', () => Promise.reject(failure)),
        ),
      ),
    ).rejects.toThrow(failure);

    expect(stopFirst).toHaveBeenCalledOnce();
  });

  it('starts nothing when no provider offers durable sync', async () => {
    const stop = await startWriterSync(coordinatorOf(realtimeOnlyProvider('webrtc')));

    expect(() => stop()).not.toThrow();
  });

  it('compacts the journal after boot, without waiting on it', async () => {
    vi.mocked(compactJournal).mockClear();

    await startWriterSync(coordinatorOf(durableSyncProvider('a', () => Promise.resolve(() => undefined))));

    // Housekeeping, not a boot step: sync is already started by the time this
    // runs, and a journal scan must never be on the path to a usable app.
    expect(compactJournal).toHaveBeenCalledOnce();
  });

  it('reports a failed compaction rather than failing the boot it followed', async () => {
    const warn = vi.spyOn(appLogger, 'warn').mockImplementation(() => undefined);
    vi.mocked(compactJournal).mockRejectedValueOnce(new Error('journal unreadable'));
    try {
      const stop = await startWriterSync(
        coordinatorOf(durableSyncProvider('a', () => Promise.resolve(() => undefined))),
      );

      // Sync is up; only the housekeeping failed, and it is best-effort.
      expect(stop).toBeInstanceOf(Function);
      await vi.waitFor(() => {
        expect(warn).toHaveBeenCalledWith('journal compaction failed', expect.anything());
      });
    } finally {
      warn.mockRestore();
    }
  });
});

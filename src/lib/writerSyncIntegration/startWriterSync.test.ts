import { describe, expect, it, vi } from 'vitest';
import { createSyncCoordinator } from 'writer-sync/core';
import type { SyncProvider } from 'writer-sync/core';
import { startWriterSync } from './startWriterSync';

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
});

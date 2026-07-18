import { describe, expect, it, vi } from 'vitest';
import type { SyncProvider } from '@/lib/syncProviders/types';
import { startWriterSync } from './startWriterSync';

vi.mock('@/lib/cloud/cloudClient', () => ({
  startCloudSession: vi.fn().mockResolvedValue(() => undefined),
  requestCloudSync: vi.fn(),
  cloudSyncState: vi.fn(),
  cloudSyncComplete: vi.fn(),
  cloudEscrowPresence: vi.fn(),
  createCloudEncryption: vi.fn(),
  unlockCloudEncryption: vi.fn(),
  recoverCloudEncryption: vi.fn(),
}));

import { startCloudSession } from '@/lib/cloud/cloudClient';

const frameSyncProvider = (id: string, start: () => Promise<() => void>): SyncProvider => ({
  id,
  frameSync: {
    start,
    requestSync: () => Promise.resolve(),
    status: { subscribe: () => ({ unsubscribe: () => undefined }) },
    syncComplete: { subscribe: () => ({ unsubscribe: () => undefined }) },
  },
});

const realtimeOnlyProvider = (id: string): SyncProvider => ({
  id,
  realtime: {
    send: () => undefined,
    onMessage: () => () => undefined,
    close: () => undefined,
    sharesStore: false,
  },
});

describe('startWriterSync', () => {
  it('starts Dexie Cloud by default', async () => {
    const stop = await startWriterSync();

    expect(startCloudSession).toHaveBeenCalledOnce();
    stop();
  });

  it('starts every configured provider that offers durable sync', async () => {
    const first = vi.fn().mockResolvedValue(() => undefined);
    const second = vi.fn().mockResolvedValue(() => undefined);

    await startWriterSync({
      providers: [frameSyncProvider('a', first), frameSyncProvider('b', second)],
    });

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('leaves a realtime-only provider alone — it is per-document, not per-session', async () => {
    const start = vi.fn().mockResolvedValue(() => undefined);

    const stop = await startWriterSync({
      providers: [realtimeOnlyProvider('webrtc'), frameSyncProvider('cloud', start)],
    });
    stop();

    expect(start).toHaveBeenCalledOnce();
  });

  it('tears every started provider down through one teardown', async () => {
    const stopFirst = vi.fn();
    const stopSecond = vi.fn();

    const stop = await startWriterSync({
      providers: [
        frameSyncProvider('a', () => Promise.resolve(stopFirst)),
        frameSyncProvider('b', () => Promise.resolve(stopSecond)),
      ],
    });
    stop();

    expect(stopFirst).toHaveBeenCalledOnce();
    expect(stopSecond).toHaveBeenCalledOnce();
  });

  it('propagates a provider that fails to start', async () => {
    const failure = new Error('cloud unreachable');

    await expect(
      startWriterSync({ providers: [frameSyncProvider('a', () => Promise.reject(failure))] }),
    ).rejects.toThrow(failure);
  });

  it('starts nothing when no provider offers durable sync', async () => {
    const stop = await startWriterSync({ providers: [realtimeOnlyProvider('webrtc')] });

    expect(() => stop()).not.toThrow();
  });
});

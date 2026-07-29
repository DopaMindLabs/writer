import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/lib/cloud/cloudClient', () => ({
  startCloudSession: vi.fn(),
  // Boot's frame ingestion subscribes to the default provider's settled-round
  // observable, so the facade mock must hand back a real subscription.
  cloudSyncComplete: vi.fn(() => ({
    subscribe: () => ({ unsubscribe: () => undefined }),
  })),
  requestCloudSync: vi.fn(),
  cloudSyncState: vi.fn(() => ({
    subscribe: () => ({ unsubscribe: () => undefined }),
  })),
  cloudEscrowPresence: vi.fn(() => ({
    subscribe: () => ({ unsubscribe: () => undefined }),
  })),
  createCloudEncryption: vi.fn(),
  unlockCloudEncryption: vi.fn(),
  recoverCloudEncryption: vi.fn(),
}));
vi.mock('@/lib/boot/devBootParams', () => ({
  applyDevBootParams: vi.fn(),
}));
vi.mock('@/db/seed', () => ({
  resetAndReseed: vi.fn(),
}));

const { useAppBoot } = await import('./useAppBoot');
const { startCloudSession } = await import('@/lib/cloud/cloudClient');
const { applyDevBootParams } = await import('@/lib/boot/devBootParams');
const { resetAndReseed } = await import('@/db/seed');

describe('useAppBoot', () => {
  beforeEach(() => {
    vi.mocked(startCloudSession).mockReset();
    vi.mocked(applyDevBootParams).mockReset();
    vi.mocked(resetAndReseed).mockReset();
    vi.mocked(startCloudSession).mockResolvedValue(() => undefined);
    vi.mocked(applyDevBootParams).mockResolvedValue(undefined);
    vi.mocked(resetAndReseed).mockResolvedValue(undefined);
  });

  it('starts the cloud session and applies dev params, then becomes ready', async () => {
    const { result } = renderHook(() => useAppBoot());
    expect(result.current.ready).toBe(false);
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(startCloudSession).toHaveBeenCalledTimes(1);
    expect(applyDevBootParams).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('surfaces a boot error when the cloud session fails to start', async () => {
    vi.mocked(startCloudSession).mockRejectedValueOnce(new Error('boot boom'));
    const { result } = renderHook(() => useAppBoot());
    await waitFor(() => {
      expect(result.current.error).toEqual(new Error('boot boom'));
    });
    expect(result.current.ready).toBe(false);
  });

  it('tears the cloud session down on unmount', async () => {
    const stop = vi.fn();
    vi.mocked(startCloudSession).mockResolvedValueOnce(stop);
    const { result, unmount } = renderHook(() => useAppBoot());
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('resetLocalData reseeds and returns to a ready state', async () => {
    const { result } = renderHook(() => useAppBoot());
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    act(() => {
      result.current.resetLocalData();
    });
    await waitFor(() => {
      expect(resetAndReseed).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(result.current.error).toBeNull();
  });

  it('resetLocalData surfaces an error when the reseed fails', async () => {
    const { result } = renderHook(() => useAppBoot());
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    vi.mocked(resetAndReseed).mockRejectedValueOnce(new Error('reseed boom'));
    act(() => {
      result.current.resetLocalData();
    });
    await waitFor(() => {
      expect(result.current.error).toEqual(new Error('reseed boom'));
    });
  });
});

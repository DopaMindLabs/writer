import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('@/lib/sync/folderSync', () => ({
  pickSyncFolder: vi.fn(),
  forgetSyncFolder: vi.fn(),
  syncAllSpacesToFolder: vi.fn(),
  syncOneSpace: vi.fn(),
}));

import {
  forgetSyncFolder,
  pickSyncFolder,
  syncAllSpacesToFolder,
  syncOneSpace,
} from '@/lib/sync/folderSync';
import { useFolderSyncActions } from './useFolderSyncActions';

const mocked = {
  pick: vi.mocked(pickSyncFolder),
  forget: vi.mocked(forgetSyncFolder),
  syncAll: vi.mocked(syncAllSpacesToFolder),
  syncOne: vi.mocked(syncOneSpace),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useFolderSyncActions', () => {
  it('sync() in all-spaces mode stores the run results', async () => {
    mocked.syncAll.mockResolvedValue({
      syncedAt: 1,
      results: [{ spaceId: 's1', name: 'Novel', ok: true }],
    });
    const { result } = renderHook(() => useFolderSyncActions());

    await act(async () => {
      await result.current.sync();
    });

    expect(mocked.syncAll).toHaveBeenCalledOnce();
    expect(result.current.results).toEqual([
      { spaceId: 's1', name: 'Novel', ok: true },
    ]);
    expect(result.current.busy).toBe(false);
  });

  it('sync() in single-space mode surfaces a failed result as an error', async () => {
    mocked.syncOne.mockResolvedValue({
      spaceId: 's2',
      name: 'Essays',
      ok: false,
      error: 'disk full',
    });
    const { result } = renderHook(() => useFolderSyncActions('s2'));

    await act(async () => {
      await result.current.sync();
    });

    expect(mocked.syncOne).toHaveBeenCalledWith('s2');
    expect(result.current.error).toBe('disk full');
  });

  it('sync() in single-space mode is silent on success', async () => {
    mocked.syncOne.mockResolvedValue({ spaceId: 's3', name: 'Poems', ok: true });
    const { result } = renderHook(() => useFolderSyncActions('s3'));

    await act(async () => {
      await result.current.sync();
    });

    expect(result.current.error).toBeNull();
  });

  it('sync() falls back to a generic message when a failure has no error', async () => {
    mocked.syncOne.mockResolvedValue({ spaceId: 's4', name: 'Notes', ok: false });
    const { result } = renderHook(() => useFolderSyncActions('s4'));

    await act(async () => {
      await result.current.sync();
    });

    expect(result.current.error).toBe('Sync failed');
  });

  it('choose() stringifies a non-Error rejection', async () => {
    mocked.pick.mockRejectedValue('picker exploded');
    const { result } = renderHook(() => useFolderSyncActions());

    await act(async () => {
      await result.current.choose();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('picker exploded');
    });
  });

  it('choose() swallows an aborted folder pick', async () => {
    mocked.pick.mockRejectedValue(
      new DOMException('cancelled', 'AbortError'),
    );
    const { result } = renderHook(() => useFolderSyncActions());

    await act(async () => {
      await result.current.choose();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('disconnect() clears results and forgets the folder', async () => {
    mocked.syncAll.mockResolvedValue({ syncedAt: 1, results: [] });
    const { result } = renderHook(() => useFolderSyncActions());

    await act(async () => {
      await result.current.sync();
    });
    await act(async () => {
      await result.current.disconnect();
    });

    expect(mocked.forget).toHaveBeenCalledOnce();
    expect(result.current.results).toBeNull();
  });
});

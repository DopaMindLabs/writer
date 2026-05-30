import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const getWritePermissionState = vi.fn();
vi.mock('@/lib/sync/folderSync', async (orig) => ({
  ...(await orig<typeof import('@/lib/sync/folderSync')>()),
  getWritePermissionState: () => getWritePermissionState(),
}));

import { useFolderPermission } from './useSync';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useFolderPermission', () => {
  it('marks permission lapsed when the browser reports prompt', async () => {
    getWritePermissionState.mockResolvedValue('prompt');
    const { result } = renderHook(() => useFolderPermission('Drafts'));
    await waitFor(() => expect(result.current.lapsed).toBe(true));
    expect(result.current.granted).toBe(false);
  });

  it('treats granted (and unknown) as usable, not lapsed', async () => {
    getWritePermissionState.mockResolvedValue('granted');
    const { result } = renderHook(() => useFolderPermission('Drafts'));
    await waitFor(() => expect(result.current.granted).toBe(true));
    expect(result.current.lapsed).toBe(false);
  });

  it('refresh re-queries the permission state', async () => {
    getWritePermissionState.mockResolvedValue('prompt');
    const { result } = renderHook(() => useFolderPermission('Drafts'));
    await waitFor(() => expect(result.current.lapsed).toBe(true));

    getWritePermissionState.mockResolvedValue('granted');
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.granted).toBe(true));
  });
});

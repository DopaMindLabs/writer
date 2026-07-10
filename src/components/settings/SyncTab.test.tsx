import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import type { SyncFolderState } from '@/hooks/useSyncFolder';
import type { SyncRunResult } from '@/lib/sync/folderSync';
import type { Space } from '@/db/schema';

const useSyncFolder = vi.fn<() => SyncFolderState>();
vi.mock('@/hooks/useSyncFolder', () => ({
  useSyncFolder: () => useSyncFolder(),
}));

const useDefaultInterval = vi.fn(() => 10);
const useSyncHistory = vi.fn<(id?: string | null) => unknown[]>(() => []);
vi.mock('@/hooks/useSync', () => ({
  useDefaultInterval: () => useDefaultInterval(),
  useSyncHistory: (spaceId?: string | null) => useSyncHistory(spaceId),
  useFolderPermission: () => ({
    granted: true,
    lapsed: false,
    refresh: () => {
    },
  }),
}));

vi.mock('@/hooks/useSpaces', () => ({
  useSpaces: () => [{ id: 's1', name: 'Novel' }] as unknown as Space[],
}));

const pickSyncFolder = vi.fn<(...a: unknown[]) => Promise<{ name: string }>>();
const forgetSyncFolder = vi.fn<(...a: unknown[]) => Promise<void>>();
const setDefaultIntervalMin = vi.fn<(...a: unknown[]) => Promise<void>>();
const syncAllSpacesToFolder = vi.fn<(...a: unknown[]) => Promise<SyncRunResult>>();
vi.mock('@/lib/sync/folderSync', () => ({
  pickSyncFolder: (...args: unknown[]) => pickSyncFolder(...args),
  forgetSyncFolder: (...args: unknown[]) => forgetSyncFolder(...args),
  setDefaultIntervalMin: (...args: unknown[]) => setDefaultIntervalMin(...args),
  syncAllSpacesToFolder: (...args: unknown[]) => syncAllSpacesToFolder(...args),
  INHERIT_INTERVAL: -1,
  INTERVAL_OPTIONS: [0, 5, 10, 30],
}));

import { SyncTab } from './SyncTab';

beforeEach(() => {
  vi.clearAllMocks();
  useDefaultInterval.mockReturnValue(10);
  useSyncHistory.mockReturnValue([]);
});

describe('SyncTab', () => {
  it('shows the unsupported notice when folder sync is not supported', () => {
    useSyncFolder.mockReturnValue({
      supported: false,
      folderName: null,
      lastSyncedAt: null,
    });
    renderWithProviders(<SyncTab />);
    expect(
      screen.getByText(/not available in this browser/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /sync all spaces/i }),
    ).not.toBeInTheDocument();
  });

  it('disables Sync until a folder is connected', () => {
    useSyncFolder.mockReturnValue({
      supported: true,
      folderName: null,
      lastSyncedAt: null,
    });
    renderWithProviders(<SyncTab />);
    expect(
      screen.getByRole('button', { name: /choose folder/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sync all spaces/i }),
    ).toBeDisabled();
  });

  it('runs a sync and renders per-space results', async () => {
    useSyncFolder.mockReturnValue({
      supported: true,
      folderName: 'Drafts',
      lastSyncedAt: null,
    });
    syncAllSpacesToFolder.mockResolvedValue({
      syncedAt: Date.now(),
      results: [
        { spaceId: 's1', name: 'Novel', ok: true },
        { spaceId: 's2', name: 'Essays', ok: false, error: 'disk full' },
      ],
    });

    renderWithProviders(<SyncTab />);
    fireEvent.click(screen.getByRole('button', { name: /sync all spaces/i }));

    await waitFor(() => { expect(syncAllSpacesToFolder).toHaveBeenCalledTimes(1); });
    expect(await screen.findByText('Novel')).toBeInTheDocument();
    expect(screen.getByText('Essays')).toBeInTheDocument();
    expect(screen.getByText('disk full')).toBeInTheDocument();
  });

  it('changes the default auto-sync interval', () => {
    useSyncFolder.mockReturnValue({
      supported: true,
      folderName: 'Drafts',
      lastSyncedAt: null,
    });
    renderWithProviders(<SyncTab />);
    fireEvent.click(screen.getByRole('button', { name: '30 min' }));
    expect(setDefaultIntervalMin).toHaveBeenCalledWith(30);
  });

  it('connects a folder via the picker', async () => {
    useSyncFolder.mockReturnValue({
      supported: true,
      folderName: null,
      lastSyncedAt: null,
    });
    pickSyncFolder.mockResolvedValue({ name: 'Drafts' });
    renderWithProviders(<SyncTab />);
    fireEvent.click(screen.getByRole('button', { name: /choose folder/i }));
    await waitFor(() => { expect(pickSyncFolder).toHaveBeenCalledTimes(1); });
  });

  it('disconnects the connected folder', async () => {
    useSyncFolder.mockReturnValue({
      supported: true,
      folderName: 'Drafts',
      lastSyncedAt: null,
    });
    renderWithProviders(<SyncTab />);
    fireEvent.click(screen.getByRole('button', { name: /disconnect/i }));
    await waitFor(() => { expect(forgetSyncFolder).toHaveBeenCalledTimes(1); });
  });

  it('surfaces an error when syncing fails', async () => {
    useSyncFolder.mockReturnValue({
      supported: true,
      folderName: 'Drafts',
      lastSyncedAt: null,
    });
    syncAllSpacesToFolder.mockRejectedValue(new Error('boom'));
    renderWithProviders(<SyncTab />);
    fireEvent.click(screen.getByRole('button', { name: /sync all spaces/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/boom/i);
  });

  describe('snapshot', () => {
    it('should match the snapshot of the connected global sync tab', () => {
      useSyncFolder.mockReturnValue({
        supported: true,
        folderName: 'Drafts',
        lastSyncedAt: null,
      });
      const { container } = renderWithProviders(<SyncTab />);
      expect(container).toMatchSnapshot();
    });
  });
});

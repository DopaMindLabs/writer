import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import type { Space } from '@/db/schema';
import type { SyncFolderState } from '@/hooks/useSyncFolder';
import type { SpaceSyncResult } from '@/lib/sync/folderSync';

const useSyncFolder = vi.fn<() => SyncFolderState>();
vi.mock('@/hooks/useSyncFolder', () => ({
  useSyncFolder: () => useSyncFolder(),
}));

const useDefaultInterval = vi.fn(() => 10);
const useSpaceInterval = vi.fn<
  (id?: string | null) => { own: number; effective: number }
>(() => ({ own: -1, effective: 10 }));
const useSyncHistory = vi.fn<(id?: string | null) => unknown[]>(() => []);
vi.mock('@/hooks/useSync', () => ({
  useDefaultInterval: () => useDefaultInterval(),
  useSpaceInterval: (id: string) => useSpaceInterval(id),
  useSyncHistory: (id?: string | null) => useSyncHistory(id),
  useFolderPermission: () => ({
    granted: true,
    lapsed: false,
    refresh: () => {
    },
  }),
}));

const pickSyncFolder = vi.fn<(...a: unknown[]) => Promise<{ name: string }>>();
const setSpaceIntervalMin = vi.fn<(...a: unknown[]) => Promise<void>>();
const syncOneSpace = vi.fn<(...a: unknown[]) => Promise<SpaceSyncResult>>();
vi.mock('@/lib/sync/folderSync', () => ({
  pickSyncFolder: (...a: unknown[]) => pickSyncFolder(...a),
  setSpaceIntervalMin: (...a: unknown[]) => setSpaceIntervalMin(...a),
  syncOneSpace: (...a: unknown[]) => syncOneSpace(...a),
  INHERIT_INTERVAL: -1,
  INTERVAL_OPTIONS: [0, 5, 10, 30],
}));

import { SpaceSyncTab } from './SpaceSyncTab';

const space = { id: 'sp1', name: 'Novel', tag: 'NOV' } as Space;

beforeEach(() => {
  vi.clearAllMocks();
  useDefaultInterval.mockReturnValue(10);
  useSpaceInterval.mockReturnValue({ own: -1, effective: 10 });
  useSyncHistory.mockReturnValue([]);
});

describe('SpaceSyncTab', () => {
  it('shows the unsupported notice on unsupported browsers', () => {
    useSyncFolder.mockReturnValue({
      supported: false,
      folderName: null,
      lastSyncedAt: null,
    });
    renderWithProviders(<SpaceSyncTab space={space} />);
    expect(screen.getByText(/folder sync needs/i)).toBeInTheDocument();
  });

  it('offers a Default inherit chip and records overrides', () => {
    useSyncFolder.mockReturnValue({
      supported: true,
      folderName: 'Drafts',
      lastSyncedAt: null,
    });
    renderWithProviders(<SpaceSyncTab space={space} />);
    expect(
      screen.getByRole('button', { name: /default \(10 min\)/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '5 min' }));
    expect(setSpaceIntervalMin).toHaveBeenCalledWith('sp1', 5);
  });

  it('syncs just this space', async () => {
    useSyncFolder.mockReturnValue({
      supported: true,
      folderName: 'Drafts',
      lastSyncedAt: null,
    });
    syncOneSpace.mockResolvedValue({ spaceId: 'sp1', name: 'Novel', ok: true });
    renderWithProviders(<SpaceSyncTab space={space} />);
    fireEvent.click(screen.getByRole('button', { name: /sync this space/i }));
    await waitFor(() => { expect(syncOneSpace).toHaveBeenCalledWith('sp1'); });
  });

  it('disables sync and offers a picker when no folder is connected', async () => {
    useSyncFolder.mockReturnValue({
      supported: true,
      folderName: null,
      lastSyncedAt: null,
    });
    pickSyncFolder.mockResolvedValue({ name: 'Drafts' });
    renderWithProviders(<SpaceSyncTab space={space} />);
    expect(
      screen.getByRole('button', { name: /sync this space/i }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /choose folder/i }));
    await waitFor(() => { expect(pickSyncFolder).toHaveBeenCalledTimes(1); });
  });

  it('shows an error when the single-space sync fails', async () => {
    useSyncFolder.mockReturnValue({
      supported: true,
      folderName: 'Drafts',
      lastSyncedAt: null,
    });
    syncOneSpace.mockResolvedValue({
      spaceId: 'sp1',
      name: 'Novel',
      ok: false,
      error: 'disk full',
    });
    renderWithProviders(<SpaceSyncTab space={space} />);
    fireEvent.click(screen.getByRole('button', { name: /sync this space/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/disk full/i);
  });

  describe('snapshot', () => {
    it('should match the snapshot of the connected per-space sync tab', () => {
      useSyncFolder.mockReturnValue({
        supported: true,
        folderName: 'Drafts',
        lastSyncedAt: null,
      });
      const { container } = renderWithProviders(<SpaceSyncTab space={space} />);
      expect(container).toMatchSnapshot();
    });
  });
});

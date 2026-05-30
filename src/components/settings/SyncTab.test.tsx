import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';

const useSyncFolder = vi.fn();
vi.mock('@/hooks/useSyncFolder', () => ({
  useSyncFolder: () => useSyncFolder(),
}));

const pickSyncFolder = vi.fn();
const forgetSyncFolder = vi.fn();
const syncAllSpacesToFolder = vi.fn();
vi.mock('@/lib/sync/folderSync', () => ({
  pickSyncFolder: (...args: unknown[]) => pickSyncFolder(...args),
  forgetSyncFolder: (...args: unknown[]) => forgetSyncFolder(...args),
  syncAllSpacesToFolder: (...args: unknown[]) => syncAllSpacesToFolder(...args),
}));

// Imported after the mocks are registered.
import { SyncTab } from './SyncTab';

beforeEach(() => {
  vi.clearAllMocks();
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
      screen.queryByRole('button', { name: /sync now/i }),
    ).not.toBeInTheDocument();
  });

  it('disables Sync now until a folder is connected', () => {
    useSyncFolder.mockReturnValue({
      supported: true,
      folderName: null,
      lastSyncedAt: null,
    });
    renderWithProviders(<SyncTab />);
    expect(
      screen.getByRole('button', { name: /choose folder/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync now/i })).toBeDisabled();
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
    fireEvent.click(screen.getByRole('button', { name: /sync now/i }));

    await waitFor(() => expect(syncAllSpacesToFolder).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Novel')).toBeInTheDocument();
    expect(screen.getByText('Essays')).toBeInTheDocument();
    expect(screen.getByText('disk full')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import type { Space } from '@/db/schema';

const useSyncFolder = vi.fn();
vi.mock('@/hooks/useSyncFolder', () => ({
  useSyncFolder: () => useSyncFolder(),
}));

const useDefaultInterval = vi.fn(() => 10);
const useSpaceInterval = vi.fn((_id?: string | null) => ({
  own: -1,
  effective: 10,
}));
const useSyncHistory = vi.fn((_id?: string | null) => [] as unknown[]);
vi.mock('@/hooks/useSync', () => ({
  useDefaultInterval: () => useDefaultInterval(),
  useSpaceInterval: (id: string) => useSpaceInterval(id),
  useSyncHistory: (id?: string | null) => useSyncHistory(id),
}));

const pickSyncFolder = vi.fn();
const setSpaceIntervalMin = vi.fn();
const syncOneSpace = vi.fn();
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
    useSyncFolder.mockReturnValue({ supported: false, folderName: null });
    renderWithProviders(<SpaceSyncTab space={space} />);
    expect(screen.getByText(/folder sync needs/i)).toBeInTheDocument();
  });

  it('offers a Default inherit chip and records overrides', () => {
    useSyncFolder.mockReturnValue({ supported: true, folderName: 'Drafts' });
    renderWithProviders(<SpaceSyncTab space={space} />);
    // Inherit chip labelled from the default interval.
    expect(
      screen.getByRole('button', { name: /default \(10 min\)/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '5 min' }));
    expect(setSpaceIntervalMin).toHaveBeenCalledWith('sp1', 5);
  });

  it('syncs just this space', async () => {
    useSyncFolder.mockReturnValue({ supported: true, folderName: 'Drafts' });
    syncOneSpace.mockResolvedValue({ spaceId: 'sp1', name: 'Novel', ok: true });
    renderWithProviders(<SpaceSyncTab space={space} />);
    fireEvent.click(screen.getByRole('button', { name: /sync this space/i }));
    await waitFor(() => expect(syncOneSpace).toHaveBeenCalledWith('sp1'));
  });

  it('disables sync and offers a picker when no folder is connected', async () => {
    useSyncFolder.mockReturnValue({ supported: true, folderName: null });
    pickSyncFolder.mockResolvedValue({ name: 'Drafts' });
    renderWithProviders(<SpaceSyncTab space={space} />);
    expect(
      screen.getByRole('button', { name: /sync this space/i }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /choose folder/i }));
    await waitFor(() => expect(pickSyncFolder).toHaveBeenCalledTimes(1));
  });

  it('shows an error when the single-space sync fails', async () => {
    useSyncFolder.mockReturnValue({ supported: true, folderName: 'Drafts' });
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
});

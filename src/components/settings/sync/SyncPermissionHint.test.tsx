import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import type { FolderPermissionState } from '@/hooks/useSync';

const useFolderPermission =
  vi.fn<(folderName: string | null) => FolderPermissionState>();
vi.mock('@/hooks/useSync', () => ({
  useFolderPermission: (folderName: string | null) =>
    useFolderPermission(folderName),
}));

const requestFolderPermission = vi.fn<(...a: unknown[]) => Promise<boolean>>();
vi.mock('@/lib/sync/folderSync', () => ({
  requestFolderPermission: (...a: unknown[]) => requestFolderPermission(...a),
}));

import { SyncPermissionHint } from './SyncPermissionHint';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SyncPermissionHint', () => {
  it('renders nothing when permission is not lapsed', () => {
    useFolderPermission.mockReturnValue({
      granted: true,
      lapsed: false,
      refresh: vi.fn(),
    });
    const { container } = renderWithProviders(
      <SyncPermissionHint folderName="Drafts" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('prompts to reconnect and re-grants on click', async () => {
    const refresh = vi.fn();
    useFolderPermission.mockReturnValue({
      granted: false,
      lapsed: true,
      refresh,
    });
    requestFolderPermission.mockResolvedValue(true);

    renderWithProviders(<SyncPermissionHint folderName="Drafts" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reconnect/i }));

    await waitFor(() =>
      { expect(requestFolderPermission).toHaveBeenCalledTimes(1); },
    );
    await waitFor(() => { expect(refresh).toHaveBeenCalled(); });
  });
});

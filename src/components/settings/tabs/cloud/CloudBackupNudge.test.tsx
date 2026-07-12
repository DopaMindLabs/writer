import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { useHasLocalSyncedData } from '@/hooks/useHasLocalSyncedData';
import { CloudBackupNudge } from './CloudBackupNudge';

vi.mock('@/hooks/useHasLocalSyncedData', () => ({
  useHasLocalSyncedData: vi.fn(() => true),
}));

describe('CloudBackupNudge', () => {
  it('nudges to sign in when set up, signed out, and holding local data', () => {
    renderWithProviders(<CloudBackupNudge hasKey />);
    expect(screen.getByText(/only on this device/i)).toBeInTheDocument();
  });

  it('stays hidden without a key', () => {
    renderWithProviders(<CloudBackupNudge hasKey={false} />);
    expect(screen.queryByText(/only on this device/i)).not.toBeInTheDocument();
  });

  it('stays hidden when there is no local data to lose', () => {
    vi.mocked(useHasLocalSyncedData).mockReturnValueOnce(false);
    renderWithProviders(<CloudBackupNudge hasKey />);
    expect(screen.queryByText(/only on this device/i)).not.toBeInTheDocument();
  });
});

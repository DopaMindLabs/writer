import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CLOUD_FLAG_KEY } from '@/lib/cloud/flag';
import { CloudSyncTab } from './CloudSyncTab';

describe('CloudSyncTab', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('shows no cloud-sync section by default (both gates off)', () => {
    renderWithProviders(<CloudSyncTab />);
    expect(screen.queryByTestId('cloud-section')).toBeNull();
  });

  it('shows the cloud-sync section when both gates are on', () => {
    vi.stubEnv('VITE_DEXIE_CLOUD_URL', 'https://x.dexie.cloud');
    localStorage.setItem(CLOUD_FLAG_KEY, 'on');
    renderWithProviders(<CloudSyncTab />);
    expect(screen.getByTestId('cloud-section')).toBeInTheDocument();
  });
});

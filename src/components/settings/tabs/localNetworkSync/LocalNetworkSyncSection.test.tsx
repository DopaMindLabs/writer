import { afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import {
  LOCAL_NETWORK_SYNC_FLAG_KEY,
  LOCAL_NETWORK_SYNC_SETTING_KEY,
} from '@/lib/localNetworkSync/flag';
import { LocalNetworkSyncSection } from './LocalNetworkSyncSection';

describe('LocalNetworkSyncSection', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('renders nothing when the gates are off', () => {
    renderWithProviders(<LocalNetworkSyncSection />);
    expect(screen.queryByTestId('local-network-sync-section')).toBeNull();
  });

  it('renders disabled pairing controls when gates are on but setting is off', () => {
    vi.stubEnv('VITE_LOCAL_NETWORK_SYNC', 'true');
    localStorage.setItem(LOCAL_NETWORK_SYNC_FLAG_KEY, 'on');
    renderWithProviders(<LocalNetworkSyncSection />);
    expect(screen.getByTestId('local-network-sync-section')).toBeInTheDocument();
    expect(screen.getByTestId('local-network-sync-toggle')).not.toBeChecked();
    expect(screen.getByTestId('local-network-sync-pair')).toBeDisabled();
    expect(screen.getByTestId('local-network-sync-join')).toBeDisabled();
  });

  it('enables pairing controls after the user opts in', async () => {
    const user = userEvent.setup();
    vi.stubEnv('VITE_LOCAL_NETWORK_SYNC', 'true');
    localStorage.setItem(LOCAL_NETWORK_SYNC_FLAG_KEY, 'on');
    renderWithProviders(<LocalNetworkSyncSection />);
    await user.click(screen.getByTestId('local-network-sync-toggle'));
    expect(localStorage.getItem(LOCAL_NETWORK_SYNC_SETTING_KEY)).toBe('on');
    expect(screen.getByTestId('local-network-sync-pair')).toBeEnabled();
    expect(screen.getByTestId('local-network-sync-join')).toBeEnabled();
  });

  it('disables pairing controls when the setting is turned off again', async () => {
    const user = userEvent.setup();
    vi.stubEnv('VITE_LOCAL_NETWORK_SYNC', 'true');
    localStorage.setItem(LOCAL_NETWORK_SYNC_FLAG_KEY, 'on');
    localStorage.setItem(LOCAL_NETWORK_SYNC_SETTING_KEY, 'on');
    renderWithProviders(<LocalNetworkSyncSection />);
    await user.click(screen.getByTestId('local-network-sync-toggle'));
    expect(localStorage.getItem(LOCAL_NETWORK_SYNC_SETTING_KEY)).toBeNull();
    expect(screen.getByTestId('local-network-sync-pair')).toBeDisabled();
    expect(screen.getByTestId('local-network-sync-join')).toBeDisabled();
  });
});

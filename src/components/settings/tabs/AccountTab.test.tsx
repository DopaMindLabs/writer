import { describe, it, expect, vi, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { getProfile } from '@/lib/account/profile';
import { CLOUD_FLAG_KEY } from '@/lib/cloud/flag';
import { LOCAL_NETWORK_SYNC_FLAG_KEY } from '@/lib/localNetworkSync/flag';
import { AccountTab } from './AccountTab';

describe('AccountTab', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('renders the account panel with a privacy notice', async () => {
    renderWithProviders(<AccountTab />);
    expect(await screen.findByTestId('account-privacy-notice')).toHaveTextContent(
      /never leaves this device/i,
    );
    expect(screen.getByTestId('setting-display-name')).toBeInTheDocument();
    expect(screen.getByTestId('setting-presence-hue')).toBeInTheDocument();
  });

  it('shows no hidden sync beta sections by default', () => {
    renderWithProviders(<AccountTab />);
    expect(screen.queryByTestId('cloud-section')).toBeNull();
    expect(screen.queryByTestId('local-network-sync-section')).toBeNull();
  });

  it('shows the cloud-sync section when both gates are on', () => {
    vi.stubEnv('VITE_DEXIE_CLOUD_URL', 'https://x.dexie.cloud');
    localStorage.setItem(CLOUD_FLAG_KEY, 'on');
    renderWithProviders(<AccountTab />);
    expect(screen.getByTestId('cloud-section')).toBeInTheDocument();
  });

  it('shows the local-network sync section when both gates are on', () => {
    vi.stubEnv('VITE_LOCAL_NETWORK_SYNC', 'true');
    localStorage.setItem(LOCAL_NETWORK_SYNC_FLAG_KEY, 'on');
    renderWithProviders(<AccountTab />);
    expect(screen.getByTestId('local-network-sync-section')).toBeInTheDocument();
  });

  it('persists the display name as it is edited', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountTab />);
    const field = await screen.findByLabelText('Display name');
    await waitFor(() => {
      expect(field).not.toBeDisabled();
    });
    await user.type(field, 'Ada');
    await waitFor(async () => {
      expect((await getProfile()).displayName).toBe('Ada');
    });
  });

  it('persists a chosen presence hue', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountTab />);
    await user.click(await screen.findByRole('radio', { name: 'Moss' }));
    await waitFor(async () => {
      expect((await getProfile()).presenceHue).toBe('presence-3');
    });
  });
});

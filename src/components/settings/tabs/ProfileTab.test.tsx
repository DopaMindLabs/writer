import { describe, it, expect, vi, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { getProfile } from '@/lib/profile/profile';
import { ProfileTab } from './ProfileTab';

describe('ProfileTab', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('renders the profile panel with a privacy notice', async () => {
    renderWithProviders(<ProfileTab />);
    expect(await screen.findByTestId('profile-privacy-notice')).toHaveTextContent(
      /never leaves this device/i,
    );
    expect(screen.getByTestId('setting-display-name')).toBeInTheDocument();
    expect(screen.getByTestId('setting-presence-hue')).toBeInTheDocument();
  });

  it('carries nothing about the cloud — that is a tab of its own', () => {
    vi.stubEnv('VITE_DEXIE_CLOUD_URL', 'https://x.dexie.cloud');
    renderWithProviders(<ProfileTab />);
    expect(screen.queryByTestId('cloud-section')).toBeNull();
  });

  it('persists the display name as it is edited', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileTab />);
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
    renderWithProviders(<ProfileTab />);
    await user.click(await screen.findByRole('radio', { name: 'Moss' }));
    await waitFor(async () => {
      expect((await getProfile()).presenceHue).toBe('presence-3');
    });
  });
});

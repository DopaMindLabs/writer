import { vi, afterEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CLOUD_FLAG_KEY } from '@/lib/cloud/flag';
import { HomeCloudSignInButton } from './HomeCloudSignInButton';

describe('HomeCloudSignInButton', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('renders nothing when the cloud-sync beta is off (default experience)', () => {
    renderWithProviders(<HomeCloudSignInButton />);
    expect(screen.queryByTestId('home-cloud-sign-in')).toBeNull();
  });

  it('invites sign-in, linking to the account tab, when the beta is on and signed out', () => {
    vi.stubEnv('VITE_DEXIE_CLOUD_URL', 'https://x.dexie.cloud');
    localStorage.setItem(CLOUD_FLAG_KEY, 'on');
    renderWithProviders(<HomeCloudSignInButton />);
    const link = screen.getByTestId('home-cloud-sign-in');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('tab=account'));
    // Rendered as a button-styled link so it reads as the header's action.
    expect(link).toHaveClass('border-ink');
  });
});

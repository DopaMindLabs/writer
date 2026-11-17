import { renderWithProviders, screen } from '@/test/test-utils';
import { HomeDeviceSyncLink } from './HomeDeviceSyncLink';

describe('HomeDeviceSyncLink', () => {
  it('names device sync and leads to its settings tab', () => {
    renderWithProviders(<HomeDeviceSyncLink />);

    const link = screen.getByRole('link', { name: 'Device sync' });
    expect(link).toHaveAttribute('href', expect.stringContaining('tab=deviceSync'));
  });

  it('is there without anything having to be enabled first', () => {
    // The action it replaced hid behind the cloud-sync beta, which left device
    // sync — the feature that needs no account at all — with no way in from
    // Home. Nothing gates this one, and nothing about it reports live state.
    renderWithProviders(<HomeDeviceSyncLink />);

    expect(screen.getByTestId('home-device-sync')).toBeVisible();
  });
});

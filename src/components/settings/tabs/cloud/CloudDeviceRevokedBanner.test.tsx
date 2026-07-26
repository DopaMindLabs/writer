import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudDeviceRevokedBanner } from './CloudDeviceRevokedBanner';

describe('CloudDeviceRevokedBanner', () => {
  it('explains that only the beta slot was freed, not the session', () => {
    renderWithProviders(<CloudDeviceRevokedBanner />);
    expect(screen.getByTestId('cloud-device-revoked')).toBeInTheDocument();
    expect(screen.getByText(/no longer holds a beta slot/i)).toBeInTheDocument();
    expect(screen.getByText(/still signed in and may keep syncing/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

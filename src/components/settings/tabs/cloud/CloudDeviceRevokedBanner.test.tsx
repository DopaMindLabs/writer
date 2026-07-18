import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudDeviceRevokedBanner } from './CloudDeviceRevokedBanner';

describe('CloudDeviceRevokedBanner', () => {
  it('explains that this device was removed from the registry', () => {
    renderWithProviders(<CloudDeviceRevokedBanner />);
    expect(screen.getByTestId('cloud-device-revoked')).toBeInTheDocument();
    expect(screen.getByText(/removed from your account/i)).toBeInTheDocument();
    expect(screen.getByText(/sign out to finish/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

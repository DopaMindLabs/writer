import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudDeviceLimitBanner } from './CloudDeviceLimitBanner';

describe('CloudDeviceLimitBanner', () => {
  it('explains the eight-device beta limit and offers no key action', () => {
    renderWithProviders(<CloudDeviceLimitBanner />);
    expect(screen.getByTestId('cloud-device-limit')).toBeInTheDocument();
    expect(screen.getByText(/already has eight devices/i)).toBeInTheDocument();
    expect(screen.getByText(/sign out on one of your other devices/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

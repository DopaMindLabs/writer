import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudDeviceLimitBanner } from './CloudDeviceLimitBanner';

describe('CloudDeviceLimitBanner', () => {
  it('explains the four-device beta limit and offers no key action', () => {
    renderWithProviders(<CloudDeviceLimitBanner />);
    expect(screen.getByTestId('cloud-device-limit')).toBeInTheDocument();
    expect(screen.getByText(/already has four devices/i)).toBeInTheDocument();
    expect(screen.getByText(/free a slot used by another device/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

import { userEvent } from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudDeviceListRow } from './CloudDeviceListRow';
import type { DeviceListEntry } from './useDeviceList';

const entry = (overrides: Partial<DeviceListEntry> = {}): DeviceListEntry => ({
  id: 'device-2',
  joinedAt: new Date('2026-03-12T10:00:00Z').getTime(),
  lastSeenAt: Date.now(),
  isThisDevice: false,
  isStale: false,
  ...overrides,
});

const renderRow = (device: DeviceListEntry, handlers = {}) => {
  const props = {
    onSignOut: vi.fn(),
    onRevoke: vi.fn(),
    ...handlers,
  };
  renderWithProviders(<CloudDeviceListRow device={device} number={2} {...props} />);
  return props;
};

describe('CloudDeviceListRow', () => {
  it('names a peer device by its join order and shows when it joined', () => {
    renderRow(entry());
    const row = screen.getByTestId('cloud-device-device-2');
    expect(row).toHaveTextContent(/Device 2/);
    expect(row).toHaveTextContent(/Joined 12 March 2026/);
  });

  it('offers Remove on a peer device and reports which one', async () => {
    const { onRevoke } = renderRow(entry());
    await userEvent.click(screen.getByTestId('cloud-device-revoke'));
    expect(onRevoke).toHaveBeenCalledWith('device-2');
  });

  it('offers Sign out — never Remove — on this device', async () => {
    // Revoking your own row is meaningless: this device holds the session, so the
    // registrar would simply rejoin it on the next sync. Signing out releases the
    // slot for real.
    const { onSignOut } = renderRow(entry({ isThisDevice: true }));
    expect(screen.queryByTestId('cloud-device-revoke')).toBeNull();
    await userEvent.click(screen.getByTestId('cloud-device-sign-out'));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('badges this device, so the user knows which row is the one in front of them', () => {
    renderRow(entry({ isThisDevice: true }));
    expect(screen.getByTestId('cloud-device-badge-current')).toHaveTextContent(
      /This device/i,
    );
  });

  it('marks a stale device inactive — its slot is already reclaimable', () => {
    renderRow(entry({ isStale: true }));
    expect(screen.getByTestId('cloud-device-badge-stale')).toHaveTextContent(
      /Inactive/i,
    );
  });

  it('gives the remove button an accessible name that says which device it removes', () => {
    renderRow(entry());
    expect(
      screen.getByRole('button', { name: /Remove Device 2 from this account/i }),
    ).toBeInTheDocument();
  });
});

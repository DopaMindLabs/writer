import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import type { TrustedDeviceEntry } from '@/lib/writerSyncIntegration/useTrustedDevices';
import { TrustedDeviceList } from './TrustedDeviceList';

const device = (overrides: Partial<TrustedDeviceEntry> = {}): TrustedDeviceEntry => ({
  deviceId: 'peer-1',
  displayName: 'Phone',
  addedAt: 1_700_000_000_000,
  lastSessionAt: 1_700_000_500_000,
  isThisDevice: false,
  isRevoked: false,
  ...overrides,
});

describe('TrustedDeviceList', () => {
  it('shows nothing at all while the first read is in flight', () => {
    const { container } = renderWithProviders(
      <TrustedDeviceList devices={undefined} onRemove={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('invites pairing when no device has been paired', () => {
    renderWithProviders(<TrustedDeviceList devices={[]} onRemove={vi.fn()} />);

    expect(screen.getByTestId('trusted-devices-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('trusted-devices')).not.toBeInTheDocument();
  });

  it('lists a paired device with when it was paired and last connected', () => {
    renderWithProviders(<TrustedDeviceList devices={[device()]} onRemove={vi.fn()} />);

    const row = screen.getByTestId('trusted-device-peer-1');
    expect(row).toHaveTextContent('Phone');
    expect(row).toHaveTextContent(/Paired/i);
    expect(row).toHaveTextContent(/last connected/i);
  });

  it('says so when a device has not connected since pairing', () => {
    renderWithProviders(
      <TrustedDeviceList
        devices={[device({ lastSessionAt: undefined })]}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByTestId('trusted-device-peer-1')).toHaveTextContent(
      /not connected since pairing/i,
    );
  });

  it('marks the device the user is looking at, and offers it no remove', () => {
    renderWithProviders(
      <TrustedDeviceList
        devices={[device({ isThisDevice: true })]}
        onRemove={vi.fn()}
      />,
    );

    const row = screen.getByTestId('trusted-device-peer-1');
    expect(row).toHaveAttribute('data-this-device', 'true');
    expect(row).toHaveTextContent(/This device/i);
    expect(
      screen.queryByTestId('trusted-device-remove-peer-1'),
    ).not.toBeInTheDocument();
  });

  it('keeps a removed device listed rather than forgetting it', () => {
    // A record is retained on removal so the same identity cannot pair again as
    // though it were new; hiding it would lose that from the user too.
    renderWithProviders(
      <TrustedDeviceList devices={[device({ isRevoked: true })]} onRemove={vi.fn()} />,
    );

    const row = screen.getByTestId('trusted-device-peer-1');
    expect(row).toHaveAttribute('data-revoked', 'true');
    expect(row).toHaveTextContent(/Removed/i);
    expect(
      screen.queryByTestId('trusted-device-remove-peer-1'),
    ).not.toBeInTheDocument();
  });

  it('removes the device the button belongs to', async () => {
    const onRemove = vi.fn();
    renderWithProviders(
      <TrustedDeviceList
        devices={[device(), device({ deviceId: 'peer-2', displayName: 'Laptop' })]}
        onRemove={onRemove}
      />,
    );

    await userEvent.click(screen.getByTestId('trusted-device-remove-peer-2'));

    expect(onRemove).toHaveBeenCalledExactlyOnceWith('peer-2');
  });

  it('states what removal cannot do, before the user removes anything', () => {
    renderWithProviders(<TrustedDeviceList devices={[device()]} onRemove={vi.fn()} />);

    expect(screen.getByTestId('trusted-devices-removal-note')).toHaveTextContent(
      /cannot reach back and erase the writing already on it/i,
    );
  });

  it('says how removal is undone, beside what it cannot do', () => {
    // The remedy lives where the removal decision is made: a fresh pairing,
    // digits confirmed on both screens, restores sync for the same identity.
    renderWithProviders(<TrustedDeviceList devices={[device()]} onRemove={vi.fn()} />);

    expect(screen.getByTestId('trusted-devices-removal-note')).toHaveTextContent(
      /pairing the device afresh .* restores sync/i,
    );
  });
});

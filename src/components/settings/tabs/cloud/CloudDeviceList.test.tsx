import { userEvent } from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudDeviceList } from './CloudDeviceList';
import type { DeviceList } from './useDeviceList';

const { useDeviceList, removeCloudDevice } = vi.hoisted(() => ({
  useDeviceList: vi.fn(),
  removeCloudDevice: vi.fn(),
}));

vi.mock('./useDeviceList', () => ({ useDeviceList }));
vi.mock('@/lib/cloud/cloudClient', () => ({ removeCloudDevice }));

const JOINED = new Date('2026-03-12T10:00:00Z').getTime();

const list = (overrides: Partial<DeviceList> = {}): DeviceList => ({
  used: 2,
  limit: 4,
  entries: [
    {
      id: 'mine',
      joinedAt: JOINED,
      lastSeenAt: Date.now(),
      isThisDevice: true,
      isStale: false,
    },
    {
      id: 'other',
      joinedAt: JOINED + 1000,
      lastSeenAt: Date.now(),
      isThisDevice: false,
      isStale: false,
    },
  ],
  ...overrides,
});

describe('CloudDeviceList', () => {
  it('renders nothing until the registry has resolved', () => {
    // Rather than flashing an empty state over a registry that is about to arrive.
    useDeviceList.mockReturnValue(undefined);
    renderWithProviders(<CloudDeviceList onSignOut={vi.fn()} />);
    expect(screen.queryByTestId('cloud-device-list')).toBeNull();
  });

  it('lists every device and reports how many slots are in use', () => {
    useDeviceList.mockReturnValue(list());
    renderWithProviders(<CloudDeviceList onSignOut={vi.fn()} />);
    expect(screen.getByTestId('cloud-device-list')).toHaveTextContent(
      /2 of 4 devices in use/i,
    );
    expect(screen.getByTestId('cloud-device-mine')).toBeInTheDocument();
    expect(screen.getByTestId('cloud-device-other')).toBeInTheDocument();
  });

  it('confirms before revoking, and only then removes the device', async () => {
    useDeviceList.mockReturnValue(list());
    renderWithProviders(<CloudDeviceList onSignOut={vi.fn()} />);

    await userEvent.click(screen.getByTestId('cloud-device-revoke'));
    // Reaching across to another machine deserves a deliberate second step.
    expect(removeCloudDevice).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Remove device/i }));
    expect(removeCloudDevice).toHaveBeenCalledWith('other');
  });

  it('removes nothing when the confirmation is dismissed', async () => {
    useDeviceList.mockReturnValue(list());
    renderWithProviders(<CloudDeviceList onSignOut={vi.fn()} />);

    await userEvent.click(screen.getByTestId('cloud-device-revoke'));
    await userEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(removeCloudDevice).not.toHaveBeenCalled();
  });

  it('shows an empty state when the account has no devices yet', () => {
    useDeviceList.mockReturnValue(list({ entries: [], used: 0 }));
    renderWithProviders(<CloudDeviceList onSignOut={vi.fn()} />);
    expect(screen.getByTestId('cloud-device-list')).toHaveTextContent(/No devices yet/i);
  });
});

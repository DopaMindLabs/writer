import { userEvent } from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudDeviceList } from './CloudDeviceList';
import type { DeviceList } from './useDeviceList';

const { useDeviceList, freeCloudDeviceSlot } = vi.hoisted(() => ({
  useDeviceList: vi.fn(),
  freeCloudDeviceSlot: vi.fn(),
}));

vi.mock('./useDeviceList', () => ({ useDeviceList }));
vi.mock('@/lib/cloud/cloudClient', () => ({ freeCloudDeviceSlot }));

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

  it('confirms before freeing a slot and states that this is not remote sign-out', async () => {
    useDeviceList.mockReturnValue(list());
    renderWithProviders(<CloudDeviceList onSignOut={vi.fn()} />);

    await userEvent.click(screen.getByTestId('cloud-device-free-slot'));
    // Reaching across to another machine deserves a deliberate second step.
    expect(freeCloudDeviceSlot).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-dialog')).toHaveTextContent(
      /does not sign that device out or stop it syncing/i,
    );

    await userEvent.click(screen.getByRole('button', { name: /Free slot/i }));
    expect(freeCloudDeviceSlot).toHaveBeenCalledWith('other');
  });

  it('frees no slot when the confirmation is dismissed', async () => {
    useDeviceList.mockReturnValue(list());
    renderWithProviders(<CloudDeviceList onSignOut={vi.fn()} />);

    await userEvent.click(screen.getByTestId('cloud-device-free-slot'));
    await userEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(freeCloudDeviceSlot).not.toHaveBeenCalled();
  });

  it('shows an empty state when the account has no devices yet', () => {
    useDeviceList.mockReturnValue(list({ entries: [], used: 0 }));
    renderWithProviders(<CloudDeviceList onSignOut={vi.fn()} />);
    expect(screen.getByTestId('cloud-device-list')).toHaveTextContent(/No devices yet/i);
  });
});

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { TrustedDeviceEntry } from '@/lib/writerSyncIntegration/useTrustedDevices';
import { TrustedDeviceList } from './TrustedDeviceList';

const device = (overrides: Partial<TrustedDeviceEntry> = {}): TrustedDeviceEntry => ({
  deviceId: 'peer-1',
  displayName: 'Phone',
  addedAt: Date.parse('2026-06-01T09:00:00Z'),
  lastSessionAt: Date.parse('2026-07-27T18:30:00Z'),
  isThisDevice: false,
  isRevoked: false,
  ...overrides,
});

const meta = {
  title: 'Settings/TrustedDeviceList',
  component: TrustedDeviceList,
  args: { onRemove: () => undefined },
} satisfies Meta<typeof TrustedDeviceList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing paired yet — the state every account starts in. */
export const NoDevices: Story = { args: { devices: [] } };

export const Paired: Story = {
  args: {
    devices: [
      device({ deviceId: 'this-device', displayName: 'Studio iMac', isThisDevice: true }),
      device(),
    ],
  },
};

/** Paired but never since connected: a device that was set up and put away. */
export const NeverConnected: Story = {
  args: { devices: [device({ lastSessionAt: undefined })] },
};

/**
 * A removed device stays listed. The record is kept so the same identity cannot
 * pair again as though it were new, and the user should be able to see that.
 */
export const Removed: Story = {
  args: {
    devices: [device(), device({ deviceId: 'peer-2', displayName: 'Old laptop', isRevoked: true })],
  },
};

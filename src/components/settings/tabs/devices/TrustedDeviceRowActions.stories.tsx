import type { Meta, StoryObj } from '@storybook/react-vite';
import type { TrustedDeviceEntry } from '@/lib/writerSyncIntegration/useTrustedDevices';
import { TrustedDeviceRowActions } from './TrustedDeviceRowActions';

const device: TrustedDeviceEntry = {
  deviceId: 'peer-1',
  displayName: 'Phone',
  addedAt: Date.parse('2026-06-01T09:00:00Z'),
  lastSessionAt: Date.parse('2026-07-27T18:30:00Z'),
  isThisDevice: false,
  isRevoked: false,
};

const meta = {
  title: 'Settings/TrustedDeviceRowActions',
  component: TrustedDeviceRowActions,
  args: { device, onRemove: () => undefined, onReconnect: () => undefined },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof TrustedDeviceRowActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing wrong with the link, so removal is the only decision on offer. */
export const Connected: Story = { args: { linkState: 'connected' } };

/** The link dropped: a way back, beside the way out. */
export const Dropped: Story = { args: { linkState: 'dropped' } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { TrustedDeviceEntry } from '@/lib/writerSyncIntegration/useTrustedDevices';
import { TrustedDeviceRow } from './TrustedDeviceRow';

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
  title: 'Settings/TrustedDeviceRow',
  component: TrustedDeviceRow,
  args: { device: device(), onRemove: () => undefined },
  decorators: [
    (Story) => (
      <ul className="max-w-[560px]">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof TrustedDeviceRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A paired device, connected since: the ordinary row. */
export const Paired: Story = {};

/** Paired and put away — set up once, never connected since. */
export const NeverConnected: Story = {
  args: { device: device({ lastSessionAt: undefined }) },
};

/** The device being looked at: nothing here can remove itself. */
export const ThisDevice: Story = {
  args: { device: device({ displayName: 'Studio iMac', isThisDevice: true }) },
};

/**
 * Removed, and still listed. The record is kept so the same identity cannot pair
 * again as though it were new, and the user should be able to see that.
 */
export const Removed: Story = {
  args: { device: device({ displayName: 'Old laptop', isRevoked: true }) },
};

/** Connected right now — the only state in which sync is actually flowing. */
export const Connected: Story = {
  args: { linkState: 'connected', onReconnect: () => undefined },
};

/**
 * The link was working and stopped. Re-pairing is the honest remedy: signalling
 * happens only through the QR exchange, so there is no channel left to
 * renegotiate over — and it costs no second key handover.
 */
export const Dropped: Story = {
  args: { linkState: 'dropped', onReconnect: () => undefined },
};

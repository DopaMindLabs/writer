import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudDeviceListRow } from './CloudDeviceListRow';

const JOINED = new Date('2026-03-12T10:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudDeviceListRow',
  component: CloudDeviceListRow,
  args: {
    number: 2,
    onSignOut: () => undefined,
    onFreeSlot: () => undefined,
  },
  decorators: [
    (Story) => (
      <ul className="w-[28rem]">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof CloudDeviceListRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Another device on the account: its beta slot can be freed from here. */
export const Peer: Story = {
  args: {
    device: {
      id: 'device-2',
      joinedAt: JOINED,
      lastSeenAt: Date.now() - 3 * 60 * 60 * 1000,
      isThisDevice: false,
      isStale: false,
    },
  },
};

/** The device in front of the user: it signs out rather than freeing its row. */
export const ThisDevice: Story = {
  args: {
    device: {
      id: 'device-1',
      joinedAt: JOINED,
      lastSeenAt: Date.now(),
      isThisDevice: true,
      isStale: false,
    },
  },
};

/** Quiet past the idle window — its slot is already reclaimable. */
export const Inactive: Story = {
  args: {
    device: {
      id: 'device-3',
      joinedAt: JOINED,
      lastSeenAt: Date.now() - 9 * DAY,
      isThisDevice: false,
      isStale: true,
    },
  },
};

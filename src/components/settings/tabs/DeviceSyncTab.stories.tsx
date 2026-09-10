import type { Meta, StoryObj } from '@storybook/react-vite';
import { DeviceSyncTab } from './DeviceSyncTab';

const meta = {
  title: 'Settings/DeviceSyncTab',
  component: DeviceSyncTab,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="max-w-[880px] p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DeviceSyncTab>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The tab against this browser's own registry, which starts empty: the invitation
 * to pair, and the retention control that only matters once a device exists. The
 * list's own states have their stories in `TrustedDeviceList`.
 */
export const Default: Story = {};

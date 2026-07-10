import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyncRunRow } from './SyncRunRow';

const meta = {
  title: 'Settings/Sync/SyncRunRow',
  component: SyncRunRow,
  parameters: { layout: 'padded' },
  args: {
    busy: false,
    disabled: false,
    idleLabel: 'Sync now',
    onSync: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SyncRunRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Busy: Story = {
  args: { busy: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const NeverSynced: Story = {
  args: { lastSyncedAt: null },
};

export const LastSynced: Story = {
  args: { lastSyncedAt: Date.UTC(2024, 0, 1, 12, 0, 0) },
};

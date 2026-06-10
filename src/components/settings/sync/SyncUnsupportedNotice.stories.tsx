import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyncUnsupportedNotice } from './SyncUnsupportedNotice';

const meta = {
  title: 'Settings/Sync/SyncUnsupportedNotice',
  component: SyncUnsupportedNotice,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SyncUnsupportedNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTitle: Story = { args: { withTitle: true } };

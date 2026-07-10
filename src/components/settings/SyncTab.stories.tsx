import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyncTab } from './SyncTab';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/SyncTab',
  component: SyncTab,
  parameters: { layout: 'fullscreen', seed: 'multipleSpaces' },
} satisfies Meta<typeof SyncTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="max-w-[880px] p-6">
      <SyncTab />
    </div>
  ),
};

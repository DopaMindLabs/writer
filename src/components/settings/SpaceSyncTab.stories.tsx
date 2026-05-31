import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleSpace } from '@/test/fixtures';
import { SpaceSyncTab } from './SpaceSyncTab';

const meta = {
  title: 'Settings/SpaceSyncTab',
  component: SpaceSyncTab,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
  args: { space: sampleSpace },
} satisfies Meta<typeof SpaceSyncTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="max-w-[880px] p-6">
      <SpaceSyncTab {...args} />
    </div>
  ),
};

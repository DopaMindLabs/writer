import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleSpace } from '@/test/fixtures';
import { SpaceSyncTab } from './SpaceSyncTab';

const meta = {
  // Seeded stories share one Dexie DB and cannot represent distinct seed
  // states side by side, so they opt out of the combined autodocs gallery and
  // are viewed one at a time in the canvas (where the per-story reseed holds).
  tags: ['!autodocs'],
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

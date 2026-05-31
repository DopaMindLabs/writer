import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyncTab } from './SyncTab';

const meta = {
  // Seeded stories share one Dexie DB and cannot represent distinct seed
  // states side by side, so they opt out of the combined autodocs gallery and
  // are viewed one at a time in the canvas (where the per-story reseed holds).
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

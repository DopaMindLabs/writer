import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SpaceSyncResult } from '@/lib/sync/folderSync';
import { SyncResultsTable } from './SyncResultsTable';

const results: SpaceSyncResult[] = [
  { spaceId: 's1', name: 'Novel', ok: true },
  { spaceId: 's2', name: 'Essays', ok: false, error: 'disk full' },
];

const meta = {
  title: 'Settings/Sync/SyncResultsTable',
  component: SyncResultsTable,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SyncResultsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedOutcomes: Story = {
  args: { results },
};

export const AllOk: Story = {
  args: {
    results: [
      { spaceId: 's1', name: 'Novel', ok: true },
      { spaceId: 's2', name: 'Essays', ok: true },
    ],
  },
};

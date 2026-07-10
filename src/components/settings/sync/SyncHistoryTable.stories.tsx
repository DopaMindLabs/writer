import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SyncEntry } from '@/db/schema';
import { SyncHistoryTable } from './SyncHistoryTable';

const NOW = Date.UTC(2024, 0, 1, 12, 0, 0);

const entries: SyncEntry[] = [
  { id: 'ok1', spaceId: 's1', when: NOW, kind: 'manual', status: 'ok', size: 2048 },
  {
    id: 'err1',
    spaceId: 's2',
    when: NOW,
    kind: 'auto',
    status: 'error',
    size: 0,
    error: 'disk full',
  },
];

const meta = {
  title: 'Settings/Sync/SyncHistoryTable',
  component: SyncHistoryTable,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SyncHistoryTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { entries: [] },
};

export const PerSpace: Story = {
  args: { entries },
};

export const AcrossSpaces: Story = {
  args: {
    entries,
    showSpace: true,
    spaceNames: { s1: 'Novel', s2: 'Essays' },
  },
};

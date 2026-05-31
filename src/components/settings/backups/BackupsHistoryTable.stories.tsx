import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Backup } from '@/db/schema';
import { BackupsHistoryTable } from './BackupsHistoryTable';

const NOW = Date.UTC(2024, 0, 1, 12, 0, 0);

const backups = [
  { id: 'b1', when: NOW, kind: 'manual', size: 2048 },
  { id: 'b2', when: NOW, kind: 'auto', size: 1024 * 1024 * 2 },
  { id: 'b3', when: NOW, kind: 'snapshot', size: 512 },
] as unknown as Backup[];

const meta = {
  title: 'Settings/Backups/BackupsHistoryTable',
  component: BackupsHistoryTable,
  parameters: { layout: 'padded' },
  args: {
    onDownload: () => undefined,
    onDelete: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BackupsHistoryTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { backups: [] },
};

export const WithBackups: Story = {
  args: { backups },
};

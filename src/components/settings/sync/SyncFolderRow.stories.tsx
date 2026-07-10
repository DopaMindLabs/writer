import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyncFolderRow } from './SyncFolderRow';

const meta = {
  title: 'Settings/Sync/SyncFolderRow',
  component: SyncFolderRow,
  parameters: { layout: 'padded' },
  args: {
    hint: 'Snapshots are written to this folder.',
    onChoose: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SyncFolderRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoFolder: Story = {
  args: { folderName: null },
};

export const ConnectOnly: Story = {
  args: { folderName: 'Drafts' },
};

export const ManageMode: Story = {
  args: { folderName: 'Drafts', onDisconnect: () => undefined },
};

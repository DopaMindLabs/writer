import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyncPermissionHint } from './SyncPermissionHint';

const meta = {
  title: 'Settings/Sync/SyncPermissionHint',
  component: SyncPermissionHint,
  parameters: { layout: 'padded' },
  args: { folderName: 'Drafts' },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SyncPermissionHint>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

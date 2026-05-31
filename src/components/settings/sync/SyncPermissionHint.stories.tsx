import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyncPermissionHint } from './SyncPermissionHint';

// SyncPermissionHint reads live permission state via useFolderPermission and
// renders nothing until write access has lapsed for the session, so in a static
// gallery it is intentionally empty. The behaviour (the warning banner +
// reconnect action) is exercised by the unit test, which stubs the hook.
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

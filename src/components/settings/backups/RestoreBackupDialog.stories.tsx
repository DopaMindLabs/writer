import type { Meta, StoryObj } from '@storybook/react-vite';
import { RestoreBackupDialog } from './RestoreBackupDialog';

const meta: Meta<typeof RestoreBackupDialog> = {
  title: 'Settings/Backups/RestoreBackupDialog',
  component: RestoreBackupDialog,
  args: {
    open: true,
    busy: false,
    onOpenChange: () => undefined,
    onConfirm: () => undefined,
  },
};
export default meta;

type Story = StoryObj<typeof RestoreBackupDialog>;

export const Open: Story = {};

export const Restoring: Story = {
  args: { busy: true },
};

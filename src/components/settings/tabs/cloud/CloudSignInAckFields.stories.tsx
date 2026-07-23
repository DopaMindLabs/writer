import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudSignInAckFields } from './CloudSignInAckFields';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudSignInAckFields',
  component: CloudSignInAckFields,
  args: {
    acknowledged: false,
    onAcknowledged: () => {},
    backupConfirmed: false,
    onBackupConfirmed: () => {},
    onCancel: () => {},
    onConfirm: () => {},
  },
} satisfies Meta<typeof CloudSignInAckFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unacknowledged: Story = {};
export const Acknowledged: Story = { args: { acknowledged: true, backupConfirmed: true } };

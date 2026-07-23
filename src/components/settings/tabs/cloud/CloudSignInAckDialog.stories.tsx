import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudSignInAckDialog } from './CloudSignInAckDialog';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudSignInAckDialog',
  component: CloudSignInAckDialog,
  parameters: { layout: 'fullscreen' },
  args: { open: true, onOpenChange: () => {}, onConfirm: () => {} },
} satisfies Meta<typeof CloudSignInAckDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

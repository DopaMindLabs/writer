import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecoveryCodeDialog } from './RecoveryCodeDialog';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/RecoveryCodeDialog',
  component: RecoveryCodeDialog,
  parameters: { layout: 'fullscreen' },
  args: { code: 'AB12-CD34-EF56-GH78', open: true, onDone: () => {} },
} satisfies Meta<typeof RecoveryCodeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

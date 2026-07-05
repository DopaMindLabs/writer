import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudKeyConflictDialog } from './CloudKeyConflictDialog';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudKeyConflictDialog',
  component: CloudKeyConflictDialog,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: () => {},
    onResolved: () => {},
    onAdopt: () => Promise.resolve(),
    onErase: () => Promise.resolve(),
  },
} satisfies Meta<typeof CloudKeyConflictDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unlock: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { RenameDocDialog } from './RenameDocDialog';

const meta = {
  tags: ['!autodocs'],
  title: 'Overlays/RenameDocDialog',
  component: RenameDocDialog,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
  args: {
    docId: 'd1',
    docName: 'Sample Doc',
    open: true,
    onOpenChange: () => {},
  },
} satisfies Meta<typeof RenameDocDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

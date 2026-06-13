import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaPickerDialog } from './MediaPickerDialog';

const meta = {
  title: 'UI/MediaPickerDialog/MediaPickerDialog',
  component: MediaPickerDialog,
  args: {
    open: true,
    onOpenChange: () => {},
    spaceId: 's1',
    onSelect: () => {},
  },
} satisfies Meta<typeof MediaPickerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

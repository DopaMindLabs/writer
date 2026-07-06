import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaPickerDialog } from './MediaPickerDialog';

// The item list is db-backed; in Storybook the library is empty, so this shows
// the empty state plus the upload affordance. The populated list and selection
// flow are covered in unit tests.
const meta = {
  tags: ['!autodocs'],
  title: 'Media/MediaPickerDialog',
  component: MediaPickerDialog,
  parameters: { layout: 'fullscreen' },
  args: {
    spaceId: 's1',
    open: true,
    onOpenChange: () => undefined,
    onSelect: () => undefined,
  },
} satisfies Meta<typeof MediaPickerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

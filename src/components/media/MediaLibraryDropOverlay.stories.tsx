import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaLibraryDropOverlay } from './MediaLibraryDropOverlay';

const meta = {
  tags: ['!autodocs'],
  title: 'Media/MediaLibraryDropOverlay',
  component: MediaLibraryDropOverlay,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="relative h-64 w-full bg-paper">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MediaLibraryDropOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dragging: Story = {};

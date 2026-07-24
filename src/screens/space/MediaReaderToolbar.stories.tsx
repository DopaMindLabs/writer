import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaReaderToolbar } from './MediaReaderToolbar';

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/MediaReaderToolbar',
  component: MediaReaderToolbar,
  args: { spaceId: 's1', mediaId: 'm1', hasItem: true },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof MediaReaderToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** While the item is loading only the back link shows. */
export const Loading: Story = { args: { hasItem: false } };

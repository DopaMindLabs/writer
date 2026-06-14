import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MediaItem } from '@/db/schema';
import { MediaList } from './MediaList';

const item = (id: string, name: string, pageCount: number): MediaItem => ({
  id,
  spaceId: 's1',
  name,
  mime: 'application/pdf',
  size: 1,
  blob: new Blob(['%PDF']),
  pageCount,
  createdAt: 0,
  updatedAt: 0,
});

const meta = {
  title: 'Surfaces/MediaLibrary/MediaList',
  component: MediaList,
  args: {
    items: [
      item('a', 'attention-is-all-you-need.pdf', 8),
      item('b', 'bert.pdf', 16),
    ],
    selectedId: 'a',
    onSelect: () => {},
    onDelete: () => {},
  },
} satisfies Meta<typeof MediaList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MediaItem } from '@/db/schema';
import { MediaViewerPane } from './MediaViewerPane';

const item: MediaItem = {
  id: 'm1',
  spaceId: 's1',
  name: '1706.03762.pdf',
  mime: 'application/pdf',
  size: 1_200_000,
  blob: new Blob(['%PDF-1.4']),
  pageCount: 8,
  createdAt: 0,
  updatedAt: 0,
};

const meta = {
  title: 'Surfaces/MediaLibrary/MediaViewerPane',
  component: MediaViewerPane,
  args: { item },
} satisfies Meta<typeof MediaViewerPane>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSelection: Story = {};
export const Empty: Story = { args: { item: null } };

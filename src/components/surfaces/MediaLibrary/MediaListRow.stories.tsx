import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MediaItem } from '@/db/schema';
import { MediaListRow } from './MediaListRow';

const item: MediaItem = {
  id: 'm1',
  spaceId: 's1',
  name: '1706.03762.pdf',
  mime: 'application/pdf',
  size: 1_200_000,
  blob: new Blob(['%PDF']),
  pageCount: 8,
  createdAt: 0,
  updatedAt: 0,
};

const meta = {
  title: 'Surfaces/MediaLibrary/MediaListRow',
  component: MediaListRow,
  args: { item, active: false, onSelect: () => {}, onDelete: () => {} },
  argTypes: { active: { control: 'boolean' } },
} satisfies Meta<typeof MediaListRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};
export const Active: Story = { args: { active: true } };

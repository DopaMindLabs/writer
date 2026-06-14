import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MediaItem } from '@/db/schema';
import { MediaPickerLibraryRow } from './MediaPickerLibraryRow';

const item: MediaItem = {
  id: 'm1',
  spaceId: 's1',
  name: '1706.03762.pdf',
  mime: 'application/pdf',
  size: 1_200_000,
  blob: new Blob(['%PDF']),
  pageCount: 8,
  createdAt: 1,
  updatedAt: 1,
};

const meta = {
  title: 'UI/MediaPickerDialog/MediaPickerLibraryRow',
  component: MediaPickerLibraryRow,
  args: { item, onSelect: () => {} },
} satisfies Meta<typeof MediaPickerLibraryRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const LongName: Story = {
  args: { item: { ...item, name: 'a-very-long-document-filename-that-truncates.pdf' } },
};

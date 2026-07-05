import type { Meta, StoryObj } from '@storybook/react-vite';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { MediaCard } from './MediaCard';

const sampleItem: MediaItem = {
  id: 'm1',
  spaceId: 's1',
  name: 'A rather long research paper title.pdf',
  mime: PDF_MIME,
  size: 2 * 1024 * 1024,
  pageCount: 12,
  blob: new Blob(['%PDF-1.4'], { type: PDF_MIME }),
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const meta = {
  tags: ['!autodocs'],
  title: 'Media/MediaCard',
  component: MediaCard,
  parameters: { layout: 'padded' },
  args: { onOpen: () => undefined },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MediaCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { item: sampleItem },
};

export const SinglePage: Story = {
  args: { item: { ...sampleItem, name: 'one-pager.pdf', pageCount: 1, size: 40 * 1024 } },
};

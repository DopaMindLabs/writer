import type { Meta, StoryObj } from '@storybook/react-vite';
import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { MediaLibrarySurface } from './MediaLibrarySurface';

const makeMedia = (overrides: Partial<MediaItem>): MediaItem => ({
  id: 'm',
  spaceId: 's1',
  name: 'doc.pdf',
  mime: PDF_MIME,
  size: 1024 * 1024,
  pageCount: 8,
  blob: new Blob(['%PDF-1.4'], { type: PDF_MIME }),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const seedMedia = async (items: MediaItem[]): Promise<Record<string, never>> => {
  await db.media.clear();
  await db.media.bulkPut(items);
  return {};
};

const meta = {
  tags: ['!autodocs'],
  title: 'Surfaces/MediaLibrarySurface',
  component: MediaLibrarySurface,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof MediaLibrarySurface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { spaceId: 's1' },
  loaders: [async () => seedMedia([])],
};

export const WithItems: Story = {
  args: { spaceId: 's1' },
  loaders: [
    async () =>
      seedMedia([
        makeMedia({ id: 'a', name: 'Research paper.pdf', pageCount: 12 }),
        makeMedia({
          id: 'b',
          name: 'meeting-notes.pdf',
          pageCount: 1,
          size: 48 * 1024,
        }),
        makeMedia({ id: 'c', name: 'appendix.pdf', pageCount: 33 }),
      ]),
  ],
};

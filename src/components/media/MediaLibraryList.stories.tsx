import type { Meta, StoryObj } from '@storybook/react-vite';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { MediaLibraryList } from './MediaLibraryList';

const noop = (): void => undefined;

const item = (id: string, name: string, pageCount: number): MediaItem => ({
  id,
  spaceId: 's1',
  name,
  mime: PDF_MIME,
  size: 2 * 1024 * 1024,
  pageCount,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: Date.UTC(2024, 9, 24, 12),
  updatedAt: 1,
});

const meta = {
  tags: ['!autodocs'],
  title: 'Media/MediaLibraryList',
  component: MediaLibraryList,
  args: {
    counts: new Map([['a', 3]]),
    onOpen: noop,
    sections: [
      {
        key: 'today',
        label: 'ADDED TODAY',
        items: [item('a', 'On the Origin of Species.pdf', 502)],
      },
      {
        key: 'oct',
        label: 'OCTOBER',
        items: [item('b', 'The Voyage of the Beagle.pdf', 432)],
      },
    ],
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-5xl bg-paper p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MediaLibraryList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Grouped: Story = {};

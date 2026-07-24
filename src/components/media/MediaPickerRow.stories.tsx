import type { Meta, StoryObj } from '@storybook/react-vite';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { MediaPickerRow } from './MediaPickerRow';

const item: MediaItem = {
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
  title: 'Media/MediaPickerRow',
  component: MediaPickerRow,
  parameters: { layout: 'padded' },
  args: { item, onChoose: () => undefined },
  decorators: [
    (Story) => (
      <ul className="w-96">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof MediaPickerRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

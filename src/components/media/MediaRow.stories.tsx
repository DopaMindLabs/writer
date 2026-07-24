import type { Meta, StoryObj } from '@storybook/react-vite';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { MediaRow } from './MediaRow';

const noop = (): void => undefined;

const item = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: 'm1',
  spaceId: 's1',
  name: 'On the Origin of Species (1859).pdf',
  mime: PDF_MIME,
  size: 4 * 1024 * 1024,
  pageCount: 502,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: Date.UTC(2024, 9, 24, 12, 0, 0),
  updatedAt: 1,
  ...overrides,
});

const meta = {
  tags: ['!autodocs'],
  title: 'Media/MediaRow',
  component: MediaRow,
  args: { item: item(), highlightCount: 0, onOpen: noop },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-5xl bg-paper p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MediaRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Older: Story = {};
export const Fresh: Story = { args: { item: item({ createdAt: Date.now() }) } };
export const Annotated: Story = { args: { highlightCount: 12 } };

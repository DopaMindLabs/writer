import type { Meta, StoryObj } from '@storybook/react-vite';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { PdfReaderPanelHost } from './PdfReaderPanelHost';

const noop = (): void => undefined;

const item: MediaItem = {
  id: 'story-media',
  spaceId: 's1',
  name: 'the-long-history-of-lorem-ipsum.pdf',
  mime: PDF_MIME,
  size: 2_400_000,
  pageCount: 42,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: new Date(2026, 6, 7).getTime(),
  updatedAt: 1,
};

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfReaderPanelHost',
  component: PdfReaderPanelHost,
  args: { item, annotationCount: 6, onNavigateToPage: noop },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex h-96 justify-end bg-paper-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfReaderPanelHost>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Highlights: Story = { args: { panel: 'highlights' } };
export const Info: Story = { args: { panel: 'info' } };

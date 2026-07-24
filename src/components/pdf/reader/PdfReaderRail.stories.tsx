import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PdfAnnotation } from '@/db/schema';
import { PdfReaderRail } from './PdfReaderRail';

const noop = (): void => undefined;

const annotation = (
  id: string,
  page: number,
  y: number,
  color: PdfAnnotation['color'],
): PdfAnnotation => ({
  id,
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page,
  rects: [{ x: 0.1, y, w: 0.2, h: 0.04 }],
  quote: id,
  color,
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
});

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfReaderRail',
  component: PdfReaderRail,
  args: {
    panel: null,
    numPages: 12,
    onPanelChange: noop,
    onNavigateToPage: noop,
    overflowSlot: null,
    annotations: [
      annotation('a', 2, 0.2, 'yellow'),
      annotation('b', 5, 0.5, 'pink'),
      annotation('c', 9, 0.3, 'blue'),
    ],
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex h-80 justify-end bg-paper-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfReaderRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const HighlightsOpen: Story = { args: { panel: 'highlights' } };
export const InfoOpen: Story = { args: { panel: 'info' } };

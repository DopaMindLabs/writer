import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PdfAnnotation } from '@/db/schema';
import { PdfThumbRail } from './PdfThumbRail';

const noop = (): void => undefined;

// Stories render the chrome only: the engine can't parse this stub blob, so the
// hook leaves skeletons in place — enough for the a11y addon and the layout.
const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });

const highlight = (
  page: number,
  color: PdfAnnotation['color'],
): PdfAnnotation => ({
  id: `${String(page)}-${color}`,
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page,
  rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.04 }],
  quote: 'q',
  color,
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
});

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfThumbRail',
  component: PdfThumbRail,
  args: {
    blob,
    numPages: 8,
    activePage: 3,
    annotations: [highlight(3, 'yellow'), highlight(3, 'pink'), highlight(6, 'blue')],
    onPageChange: noop,
    onPrev: noop,
    onNext: noop,
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex h-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfThumbRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rail: Story = {};
export const NoHighlights: Story = { args: { annotations: [] } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PdfAnnotation } from '@/db/schema';
import { PdfHighlightLayer } from './PdfHighlightLayer';

const mark = (id: string, y: number, color: PdfAnnotation['color']): PdfAnnotation => ({
  id,
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page: 1,
  rects: [{ x: 0.08, y, w: 0.6, h: 0.05 }],
  quote: id,
  color,
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
});

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfHighlightLayer',
  component: PdfHighlightLayer,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="relative h-64 w-full max-w-md bg-paper-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfHighlightLayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Multiple: Story = {
  args: {
    page: 1,
    annotations: [mark('a', 0.15, 'yellow'), mark('b', 0.3, 'pink'), mark('c', 0.45, 'blue')],
  },
};

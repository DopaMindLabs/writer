import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PdfAnnotation } from '@/db/schema';
import { PdfRailTicks } from './PdfRailTicks';

const noop = (): void => undefined;

const tick = (
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
  rects: [{ x: 0.1, y, w: 0.3, h: 0.04 }],
  quote: `quote ${id}`,
  color,
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
});

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfRailTicks',
  component: PdfRailTicks,
  args: {
    numPages: 12,
    onNavigateToPage: noop,
    annotations: [
      tick('a', 1, 0.2, 'yellow'),
      tick('b', 4, 0.5, 'pink'),
      tick('c', 8, 0.3, 'blue'),
      tick('d', 11, 0.7, 'green'),
    ],
  },
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="relative h-72 w-11 border-l border-rule bg-paper">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfRailTicks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ticks: Story = {};
export const Empty: Story = { args: { annotations: [] } };

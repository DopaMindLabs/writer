import type { Meta, StoryObj } from '@storybook/react-vite';
import { AnnotationLayer } from './AnnotationLayer';
import type { AnnotatorAnnotation } from '../core/types';

const mark = (id: string, y: number, color: string): AnnotatorAnnotation => ({
  id,
  kind: 'highlight',
  page: 1,
  rects: [{ x: 0.08, y, w: 0.6, h: 0.05 }],
  quote: id,
  color,
  createdAt: 1,
});

const getMarkLabel = (a: AnnotatorAnnotation): string => `Highlight: ${a.quote}`;

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/AnnotationLayer',
  component: AnnotationLayer,
  args: { getMarkLabel },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="relative h-64 w-full max-w-md bg-paper-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AnnotationLayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Multiple: Story = {
  args: {
    page: 1,
    annotations: [mark('a', 0.15, 'yellow'), mark('b', 0.3, 'pink'), mark('c', 0.45, 'blue')],
  },
};

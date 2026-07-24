import type { Meta, StoryObj } from '@storybook/react-vite';
import { AnnotationMark } from './AnnotationMark';
import type { AnnotatorAnnotation } from '../core/types';

const base: AnnotatorAnnotation = {
  id: 'h1',
  kind: 'highlight',
  page: 1,
  rects: [{ x: 0.08, y: 0.2, w: 0.5, h: 0.06 }],
  quote: 'Lorem ipsum highlights beautifully.',
  color: 'yellow',
  createdAt: 1,
};

const getMarkLabel = (a: AnnotatorAnnotation): string => `Highlight: ${a.quote}`;

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/AnnotationMark',
  component: AnnotationMark,
  args: { getMarkLabel },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="relative h-64 w-full max-w-md bg-paper-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AnnotationMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Yellow: Story = { args: { annotation: base } };
export const Pink: Story = { args: { annotation: { ...base, color: 'pink' } } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PdfAnnotation } from '@/db/schema';
import { PdfHighlightMark } from './PdfHighlightMark';

const base: PdfAnnotation = {
  id: 'h1',
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page: 1,
  rects: [{ x: 0.08, y: 0.2, w: 0.5, h: 0.06 }],
  quote: 'Lorem ipsum highlights beautifully.',
  color: 'yellow',
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
};

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfHighlightMark',
  component: PdfHighlightMark,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="relative h-64 w-full max-w-md bg-paper-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfHighlightMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Yellow: Story = { args: { annotation: base } };
export const Pink: Story = { args: { annotation: { ...base, color: 'pink' } } };

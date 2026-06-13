import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfCardThumbnail } from './PdfCardThumbnail';

const meta = {
  title: 'Surfaces/PdfCard/PdfCardThumbnail',
  component: PdfCardThumbnail,
  args: {
    noteId: 'n1',
    name: '1706.03762.pdf',
    blob: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    pageCount: 8,
  },
} satisfies Meta<typeof PdfCardThumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

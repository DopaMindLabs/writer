import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfCardError } from './PdfCardError';

const meta = {
  title: 'Surfaces/PdfCard/PdfCardError',
  component: PdfCardError,
  args: {
    noteId: 'n1',
    url: 'https://arxiv.org/pdf/1706.03762.pdf',
    message: 'The PDF host blocks cross-origin requests.',
    busy: false,
    onResubmit: () => {},
  },
} satisfies Meta<typeof PdfCardError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cors: Story = {};
export const NotFound: Story = { args: { message: 'Server returned 404.' } };

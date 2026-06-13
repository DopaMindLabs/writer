import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfCardError } from './PdfCardError';

const meta = {
  title: 'Surfaces/PdfCard/PdfCardError',
  component: PdfCardError,
  args: {
    noteId: 'n1',
    message: 'The PDF host blocks cross-origin requests.',
    onEdit: () => {},
  },
} satisfies Meta<typeof PdfCardError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cors: Story = {};
export const Untrusted: Story = {
  args: { message: 'This domain is not in your trusted list.' },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfViewerStatus } from './PdfViewerStatus';

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfViewerStatus',
  component: PdfViewerStatus,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PdfViewerStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: { status: 'loading' },
};

export const Error: Story = {
  args: { status: 'error', onRetry: () => undefined },
};

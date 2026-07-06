import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfViewerToolbar } from './PdfViewerToolbar';

const noop = () => undefined;

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfViewerToolbar',
  component: PdfViewerToolbar,
  parameters: { layout: 'fullscreen' },
  args: {
    onPrev: noop,
    onNext: noop,
    onZoomOut: noop,
    onZoomIn: noop,
  },
} satisfies Meta<typeof PdfViewerToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MidDocument: Story = {
  args: {
    pageNumber: 2,
    numPages: 5,
    canPrev: true,
    canNext: true,
    canZoomOut: true,
    canZoomIn: true,
  },
};

export const AtFirstPage: Story = {
  args: {
    pageNumber: 1,
    numPages: 5,
    canPrev: false,
    canNext: true,
    canZoomOut: true,
    canZoomIn: true,
  },
};

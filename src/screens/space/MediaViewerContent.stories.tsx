import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import { MediaViewerContent } from './MediaViewerContent';

const noop = (): void => undefined;
const stubView: PdfViewport = {
  pageNumber: 1,
  numPages: 0,
  scale: 1,
  setNumPages: noop,
  prev: noop,
  next: noop,
  goToPage: noop,
  zoomOut: noop,
  zoomIn: noop,
  resetZoom: noop,
};

// The loading and missing states render without pdf.js; the present-item state
// is exercised in unit tests and e2e, not Storybook.
const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/MediaViewerContent',
  component: MediaViewerContent,
  parameters: { layout: 'fullscreen' },
  args: { spaceId: 's1', view: stubView },
} satisfies Meta<typeof MediaViewerContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: { item: undefined },
};

export const SourceRemoved: Story = {
  args: { item: null },
};

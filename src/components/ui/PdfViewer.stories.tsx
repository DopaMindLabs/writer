import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfViewer } from './PdfViewer';

const makeBlob = (): Blob => {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  return new Blob([bytes], { type: 'application/pdf' });
};

const meta = {
  title: 'Media/PdfViewer',
  component: PdfViewer,
  parameters: {
    docs: {
      description: {
        component:
          'PDF viewer with thumbnail and pane modes. Thumbnail is decorative (aria-hidden); pane has page navigation, zoom and an aria-live page summary.',
      },
    },
  },
} satisfies Meta<typeof PdfViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Thumbnail: Story = {
  args: {
    blob: makeBlob(),
    name: 'paper.pdf',
    mode: 'thumbnail',
    pageCount: 8,
  },
};

export const Pane: Story = {
  args: {
    blob: makeBlob(),
    name: 'paper.pdf',
    mode: 'pane',
    pageCount: 8,
  },
  parameters: {
    layout: 'fullscreen',
  },
};

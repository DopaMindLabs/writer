import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfViewer } from './PdfViewer';

// An unparseable blob drives the loading → error path without a real PDF; real
// rendering is proven in the e2e suite, not Storybook.
const brokenPdf = new Blob(['not a pdf'], { type: 'application/pdf' });

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfViewer',
  component: PdfViewer,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="h-[80vh]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: { blob: brokenPdf, title: 'Paper.pdf' },
};

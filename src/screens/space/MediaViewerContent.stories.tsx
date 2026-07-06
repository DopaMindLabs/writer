import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaViewerContent } from './MediaViewerContent';

// The loading and missing states render without pdf.js; the present-item state
// is exercised in unit tests and e2e, not Storybook.
const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/MediaViewerContent',
  component: MediaViewerContent,
  parameters: { layout: 'fullscreen' },
  args: { spaceId: 's1' },
} satisfies Meta<typeof MediaViewerContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: { item: undefined },
};

export const SourceRemoved: Story = {
  args: { item: null },
};

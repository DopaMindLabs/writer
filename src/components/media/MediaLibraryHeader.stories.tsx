import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaLibraryHeader } from './MediaLibraryHeader';

const meta = {
  tags: ['!autodocs'],
  title: 'Media/MediaLibraryHeader',
  component: MediaLibraryHeader,
  args: { spaceId: 's1', pdfCount: 8, annotationCount: 24 },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof MediaLibraryHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {};
export const Empty: Story = { args: { pdfCount: 0, annotationCount: 0 } };

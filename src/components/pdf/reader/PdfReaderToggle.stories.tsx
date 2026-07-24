import type { Meta, StoryObj } from '@storybook/react-vite';
import { Files, PanelRight } from '@/components/libs/icons';
import { PdfReaderToggle } from './PdfReaderToggle';

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfReaderToggle',
  component: PdfReaderToggle,
  args: {
    mediaId: 'story-media',
    icon: Files,
    label: 'Page thumbnails',
    testId: 'pdf-thumbs-toggle',
    field: 'thumbs',
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PdfReaderToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Thumbnails: Story = {};
export const Panels: Story = {
  args: {
    icon: PanelRight,
    label: 'Reader panels',
    testId: 'pdf-rail-toggle',
    field: 'railHidden',
    invert: true,
  },
};

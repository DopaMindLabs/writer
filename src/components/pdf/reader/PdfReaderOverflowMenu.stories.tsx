import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfReaderOverflowMenu } from './PdfReaderOverflowMenu';

const noop = (): void => undefined;

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfReaderOverflowMenu',
  component: PdfReaderOverflowMenu,
  args: {
    spaceId: 's1',
    canZoomIn: true,
    canZoomOut: true,
    onZoomIn: noop,
    onZoomOut: noop,
    onResetZoom: noop,
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof PdfReaderOverflowMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overflow: Story = {};
export const AtZoomBounds: Story = { args: { canZoomIn: false, canZoomOut: false } };

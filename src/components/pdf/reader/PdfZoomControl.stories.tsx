import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfZoomControl } from './PdfZoomControl';

const noop = (): void => undefined;

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfZoomControl',
  component: PdfZoomControl,
  args: {
    scale: 1,
    canZoomIn: true,
    canZoomOut: true,
    onZoomIn: noop,
    onZoomOut: noop,
    onResetZoom: noop,
  },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="relative h-40 w-full bg-paper-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfZoomControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ZoomedIn: Story = { args: { scale: 1.5, canZoomIn: true } };
export const AtMaximum: Story = { args: { scale: 2, canZoomIn: false } };
export const AtMinimum: Story = { args: { scale: 0.5, canZoomOut: false } };

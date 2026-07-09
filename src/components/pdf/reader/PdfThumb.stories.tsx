import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfThumb } from './PdfThumb';

const noop = (): void => undefined;

// A 1×1 transparent PNG stands in for a rendered page in the resolved stories.
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfThumb',
  component: PdfThumb,
  args: { page: 4, active: false, colors: [], onSelect: noop },
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-28 bg-paper p-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfThumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Skeleton: Story = {};
export const Rendered: Story = { args: { src: PIXEL } };
export const Active: Story = { args: { src: PIXEL, active: true } };
export const WithTicks: Story = {
  args: { src: PIXEL, colors: ['yellow', 'pink', 'blue'] },
};

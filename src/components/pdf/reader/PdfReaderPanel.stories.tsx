import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfReaderPanel } from './PdfReaderPanel';

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfReaderPanel',
  component: PdfReaderPanel,
  args: {
    title: 'Highlights & notes',
    count: 6,
    children: <div className="p-5 font-serif text-[13px] text-ink-2">Panel body</div>,
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex h-80 justify-end bg-paper-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfReaderPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Highlights: Story = {};
export const Info: Story = { args: { title: 'Document info', count: undefined } };
export const WithFooter: Story = {
  args: {
    footerSlot: (
      <div className="border-t border-rule px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-ink-3">
        + Add to brain space
      </div>
    ),
  },
};

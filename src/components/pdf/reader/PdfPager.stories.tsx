import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfPager } from './PdfPager';

const noop = (): void => undefined;

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfPager',
  component: PdfPager,
  args: { pageNumber: 12, numPages: 55, onPrev: noop, onNext: noop },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="relative h-40 w-full bg-paper-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfPager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Middle: Story = {};
export const FirstPage: Story = { args: { pageNumber: 1 } };
export const LastPage: Story = { args: { pageNumber: 55 } };

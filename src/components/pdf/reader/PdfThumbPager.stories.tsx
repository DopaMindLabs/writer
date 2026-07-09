import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfThumbPager } from './PdfThumbPager';

const noop = (): void => undefined;

const meta = {
  tags: ['!autodocs'],
  title: 'Pdf/PdfThumbPager',
  component: PdfThumbPager,
  args: { pageNumber: 3, numPages: 12, onPrev: noop, onNext: noop },
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-28 bg-paper">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PdfThumbPager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Middle: Story = {};
export const FirstPage: Story = { args: { pageNumber: 1 } };
export const LastPage: Story = { args: { pageNumber: 12 } };

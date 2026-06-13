import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfCardUrlInput } from './PdfCardUrlInput';

const meta = {
  title: 'Surfaces/PdfCard/PdfCardUrlInput',
  component: PdfCardUrlInput,
  args: {
    initialValue: '',
    busy: false,
    onSubmit: () => {},
    testIdPrefix: 'story',
  },
  argTypes: { busy: { control: 'boolean' } },
} satisfies Meta<typeof PdfCardUrlInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Prefilled: Story = {
  args: { initialValue: 'https://arxiv.org/pdf/1706.03762.pdf' },
};
export const Fetching: Story = { args: { busy: true } };

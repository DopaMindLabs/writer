import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfCardActions } from './PdfCardActions';

const meta = {
  title: 'Surfaces/PdfCard/PdfCardActions',
  component: PdfCardActions,
  args: {
    noteId: 'n1',
    busy: false,
    onOpenBeside: () => {},
    onEditUrl: () => {},
    onRefresh: () => {},
  },
  argTypes: { busy: { control: 'boolean' } },
} satisfies Meta<typeof PdfCardActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};
export const Busy: Story = { args: { busy: true } };

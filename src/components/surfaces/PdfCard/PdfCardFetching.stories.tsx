import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfCardFetching } from './PdfCardFetching';

const meta = {
  title: 'Surfaces/PdfCard/PdfCardFetching',
  component: PdfCardFetching,
  args: { noteId: 'n1' },
} satisfies Meta<typeof PdfCardFetching>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fetching: Story = {};

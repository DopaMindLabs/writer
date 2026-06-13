import type { Meta, StoryObj } from '@storybook/react-vite';
import { PdfCardEmpty } from './PdfCardEmpty';

const meta = {
  title: 'Surfaces/PdfCard/PdfCardEmpty',
  component: PdfCardEmpty,
  args: { noteId: 'n1', onPick: () => {} },
} satisfies Meta<typeof PdfCardEmpty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

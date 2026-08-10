import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotebookPageControls } from './NotebookPageControls';

const meta = {
  title: 'Notebook/NotebookPageControls',
  component: NotebookPageControls,
  args: { pageNumber: 2, totalPages: 4, onPrevious: () => {}, onNext: () => {} },
} satisfies Meta<typeof NotebookPageControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MiddlePage: Story = {};
export const FirstPage: Story = { args: { pageNumber: 1 } };

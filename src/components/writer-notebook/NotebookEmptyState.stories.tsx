import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotebookEmptyState } from './NotebookEmptyState';

const meta = {
  title: 'Notebook/NotebookEmptyState',
  component: NotebookEmptyState,
} satisfies Meta<typeof NotebookEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

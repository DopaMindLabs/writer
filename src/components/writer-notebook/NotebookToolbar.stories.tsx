import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotebookToolbar } from './NotebookToolbar';

const meta = {
  title: 'Notebook/NotebookToolbar',
  component: NotebookToolbar,
  args: { onFiles: () => {}, disabled: false },
} satisfies Meta<typeof NotebookToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotebookProcessingStatus } from './NotebookProcessingStatus';

const meta = {
  title: 'Notebook/NotebookProcessingStatus',
  component: NotebookProcessingStatus,
  args: { processing: true, error: null },
} satisfies Meta<typeof NotebookProcessingStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Processing: Story = {};
export const Error: Story = { args: { processing: false, error: 'Image could not be decoded' } };

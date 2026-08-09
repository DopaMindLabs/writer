import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleMetadata } from '@/test/fixtures';
import { WriterNotebookLink } from './WriterNotebookLink';

const notebook = {
  ...sampleMetadata('s1'),
  id: 'nb1', spaceId: 's1', title: 'Field notebook', createdAt: 1, updatedAt: 1,
};

const meta = {
  title: 'Navigation/WriterNotebookLink',
  component: WriterNotebookLink,
  args: { notebook, pageCount: 4, active: false },
} satisfies Meta<typeof WriterNotebookLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Active: Story = { args: { active: true } };

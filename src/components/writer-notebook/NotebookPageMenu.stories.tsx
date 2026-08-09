import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotebookPageMenu } from './NotebookPageMenu';

const meta = {
  title: 'Notebook/NotebookPageMenu',
  component: NotebookPageMenu,
  args: {
    canMoveEarlier: true,
    canMoveLater: true,
    onRotate: () => {},
    onMoveEarlier: () => {},
    onMoveLater: () => {},
    onDelete: () => {},
  },
} satisfies Meta<typeof NotebookPageMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FirstPage: Story = { args: { canMoveEarlier: false } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotebookPageThumbnail } from './NotebookPageThumbnail';

const page = new Blob(['preview'], { type: 'image/webp' });

const meta = {
  title: 'Notebook/NotebookPageThumbnail',
  component: NotebookPageThumbnail,
  args: { blob: page, pageNumber: 1, selected: false, onSelect: () => {} },
} satisfies Meta<typeof NotebookPageThumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };

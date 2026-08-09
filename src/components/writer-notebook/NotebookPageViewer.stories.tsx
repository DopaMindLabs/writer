import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotebookPageViewer } from './NotebookPageViewer';

const page = new Blob(['preview'], { type: 'image/webp' });

const meta = {
  title: 'Notebook/NotebookPageViewer',
  component: NotebookPageViewer,
  parameters: { layout: 'fullscreen' },
  args: { blob: page, pageNumber: 1, rotation: 0 },
} satisfies Meta<typeof NotebookPageViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Rotated: Story = { args: { rotation: 90 } };

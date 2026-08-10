import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotebookPageSurface } from './NotebookPageSurface';

const meta = {
  title: 'Notebook/NotebookPageSurface',
  component: NotebookPageSurface,
  parameters: { layout: 'fullscreen' },
  args: {
    pages: [],
    assets: [],
    selected: undefined,
    source: undefined,
    vector: undefined,
    pageIndex: -1,
    focusPageId: null,
    onSelect: () => {},
  },
} satisfies Meta<typeof NotebookPageSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

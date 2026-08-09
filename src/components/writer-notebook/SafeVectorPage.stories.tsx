import type { Meta, StoryObj } from '@storybook/react-vite';
import { SafeVectorPage } from './SafeVectorPage';

const meta = {
  title: 'Notebook/SafeVectorPage',
  component: SafeVectorPage,
  args: {
    document: {
      version: 1,
      width: 100,
      height: 200,
      paths: [{ d: 'M10 10L90 190', fill: '#111' }],
    },
    pageNumber: 1,
    rotation: 0,
  },
} satisfies Meta<typeof SafeVectorPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Rotated: Story = { args: { rotation: 90 } };

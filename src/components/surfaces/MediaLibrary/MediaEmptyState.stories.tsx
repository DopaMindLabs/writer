import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaEmptyState } from './MediaEmptyState';

const meta = {
  title: 'Surfaces/MediaLibrary/MediaEmptyState',
  component: MediaEmptyState,
} satisfies Meta<typeof MediaEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

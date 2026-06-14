import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaPickerUrlTab } from './MediaPickerUrlTab';

const meta = {
  title: 'UI/MediaPickerDialog/MediaPickerUrlTab',
  component: MediaPickerUrlTab,
  args: { onSelect: () => {} },
} satisfies Meta<typeof MediaPickerUrlTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

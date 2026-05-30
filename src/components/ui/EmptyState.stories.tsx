import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Atoms/EmptyState',
  component: EmptyState,
  args: { caption: 'No syncs yet.' },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CaptionOnly: Story = {};

export const WithTitle: Story = {
  args: {
    title: 'Folder sync unavailable',
    caption: 'Use a Chromium-based browser to connect a local folder.',
  },
};

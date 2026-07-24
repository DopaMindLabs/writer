import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaLibraryFooter } from './MediaLibraryFooter';

const meta = {
  tags: ['!autodocs'],
  title: 'Media/MediaLibraryFooter',
  component: MediaLibraryFooter,
  args: { shown: 8, total: 12 },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof MediaLibraryFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AllShown: Story = { args: { shown: 12, total: 12 } };

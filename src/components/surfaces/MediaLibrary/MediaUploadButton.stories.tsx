import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaUploadButton } from './MediaUploadButton';

const meta = {
  title: 'Surfaces/MediaLibrary/MediaUploadButton',
  component: MediaUploadButton,
  args: { spaceId: 's1' },
} satisfies Meta<typeof MediaUploadButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

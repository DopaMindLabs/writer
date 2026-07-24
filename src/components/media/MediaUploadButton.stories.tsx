import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaUploadButton } from './MediaUploadButton';

const meta = {
  tags: ['!autodocs'],
  title: 'Media/MediaUploadButton',
  component: MediaUploadButton,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof MediaUploadButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { spaceId: 's1' },
};

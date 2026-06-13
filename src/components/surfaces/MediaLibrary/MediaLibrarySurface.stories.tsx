import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaLibrarySurface } from './MediaLibrarySurface';

const meta = {
  title: 'Surfaces/MediaLibrary/MediaLibrarySurface',
  component: MediaLibrarySurface,
  args: { spaceId: 's1' },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof MediaLibrarySurface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

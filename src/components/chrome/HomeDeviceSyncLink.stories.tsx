import type { Meta, StoryObj } from '@storybook/react-vite';
import { HomeDeviceSyncLink } from './HomeDeviceSyncLink';

const meta = {
  tags: ['!autodocs'],
  title: 'Chrome/HomeDeviceSyncLink',
  component: HomeDeviceSyncLink,
} satisfies Meta<typeof HomeDeviceSyncLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The one state it has: a way in, in the nav's voice, saying nothing about a link. */
export const Default: Story = {};

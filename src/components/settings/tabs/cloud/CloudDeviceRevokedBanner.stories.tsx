import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudDeviceRevokedBanner } from './CloudDeviceRevokedBanner';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudDeviceRevokedBanner',
  component: CloudDeviceRevokedBanner,
} satisfies Meta<typeof CloudDeviceRevokedBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Another browser freed this device's beta slot without ending its session. */
export const SlotFreed: Story = {};

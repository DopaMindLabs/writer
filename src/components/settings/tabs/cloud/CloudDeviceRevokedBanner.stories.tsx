import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudDeviceRevokedBanner } from './CloudDeviceRevokedBanner';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudDeviceRevokedBanner',
  component: CloudDeviceRevokedBanner,
} satisfies Meta<typeof CloudDeviceRevokedBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** This device's slot on the account was freed. */
export const Revoked: Story = {};

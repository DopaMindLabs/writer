import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudDeviceLimitBanner } from './CloudDeviceLimitBanner';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudDeviceLimitBanner',
  component: CloudDeviceLimitBanner,
} satisfies Meta<typeof CloudDeviceLimitBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Blocked: Story = {};

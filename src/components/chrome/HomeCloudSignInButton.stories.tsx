import type { Meta, StoryObj } from '@storybook/react-vite';
import { CLOUD_FLAG_KEY } from '@/lib/cloud/flag';
import { HomeCloudSignInButton } from './HomeCloudSignInButton';

const meta = {
  tags: ['!autodocs'],
  title: 'Chrome/HomeCloudSignInButton',
  component: HomeCloudSignInButton,
  decorators: [
    (Story) => {
      localStorage.setItem(CLOUD_FLAG_KEY, 'on');
      return <Story />;
    },
  ],
} satisfies Meta<typeof HomeCloudSignInButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignedOut: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudPrivacyDisclosure } from './CloudPrivacyDisclosure';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudPrivacyDisclosure',
  component: CloudPrivacyDisclosure,
} satisfies Meta<typeof CloudPrivacyDisclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

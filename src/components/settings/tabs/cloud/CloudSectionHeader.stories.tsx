import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudSectionHeader } from './CloudSectionHeader';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudSectionHeader',
  component: CloudSectionHeader,
} satisfies Meta<typeof CloudSectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

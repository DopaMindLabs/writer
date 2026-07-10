import type { Meta, StoryObj } from '@storybook/react-vite';
import { LearnMore } from './LearnMore';

const meta = {
  title: 'Help/LearnMore',
  component: LearnMore,
} satisfies Meta<typeof LearnMore>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { slug: 'getting-started' },
};

export const WithAnchor: Story = {
  args: { slug: 'keyboard-shortcuts', anchor: 'global' },
};

export const CustomLabel: Story = {
  args: { slug: 'your-data', label: 'Read more about backups' },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Link } from './Link';

const meta = {
  title: 'Atoms/Link',
  component: Link,
  args: { children: 'read the brief →' },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InternalGhost: Story = {
  args: { to: '/', kind: 'ghost', children: 'back to library' },
};

export const InternalPrimary: Story = {
  args: { to: '/', kind: 'primary', children: 'go home' },
};

export const InternalSecondary: Story = {
  args: { to: '/', kind: 'secondary', children: 'peek inside' },
};

export const External: Story = {
  args: {
    href: 'https://example.com',
    kind: 'ghost',
    children: 'read more on example.com →',
  },
};

export const ExternalPrimary: Story = {
  args: {
    href: 'https://example.com',
    kind: 'primary',
    children: 'subscribe',
  },
};

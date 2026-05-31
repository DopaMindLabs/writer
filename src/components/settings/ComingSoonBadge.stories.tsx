import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComingSoonBadge } from './ComingSoonBadge';

const meta = {
  title: 'Settings/ComingSoonBadge',
  component: ComingSoonBadge,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ComingSoonBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCustomClass: Story = {
  args: { className: 'px-2 py-1 text-[10px]' },
};

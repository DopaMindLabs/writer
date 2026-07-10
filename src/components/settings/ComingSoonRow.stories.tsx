import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComingSoonRow } from './ComingSoonRow';

const meta = {
  title: 'Settings/ComingSoonRow',
  component: ComingSoonRow,
  parameters: { layout: 'padded' },
  args: {
    label: 'Smart suggestions',
    tooltip: 'AI-assisted suggestions are on the way.',
  },
} satisfies Meta<typeof ComingSoonRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-[560px]">
      <ComingSoonRow {...args} />
    </div>
  ),
};

export const WithHint: Story = {
  render: (args) => (
    <div className="w-[560px]">
      <ComingSoonRow {...args} hint="Available in a later release." />
    </div>
  ),
};

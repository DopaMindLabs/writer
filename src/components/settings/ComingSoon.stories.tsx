import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/Button';
import { ComingSoon } from './ComingSoon';

const meta = {
  title: 'Settings/ComingSoon',
  component: ComingSoon,
  parameters: { layout: 'padded' },
  args: { hint: 'Find in doc' },
} satisfies Meta<typeof ComingSoon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tooltip: Story = {
  render: (args) => (
    <ComingSoon {...args}>
      <Button kind="secondary">Search</Button>
    </ComingSoon>
  ),
};

export const WithBadge: Story = {
  render: (args) => (
    <ComingSoon {...args} showBadge>
      <Button kind="secondary">Export</Button>
    </ComingSoon>
  ),
};

export const Overlay: Story = {
  render: (args) => (
    <ComingSoon {...args} overlay className="w-72">
      <div className="border border-rule p-6 text-[13px] text-ink">
        A future panel lives here.
      </div>
    </ComingSoon>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Space } from '@/db/schema';
import { MobileNavSpaceRow } from './MobileNavSpaceRow';

const space: Space = {
  id: 's1',
  tag: 'ALP',
  name: 'Alpha — a longer space name that truncates',
  shared: false,
  template: 'blank',
  createdAt: 0,
  updatedAt: 0,
};

const meta = {
  title: 'Navigation/MobileNavSpaceRow',
  component: MobileNavSpaceRow,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="w-[320px] border-x border-rule bg-paper-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MobileNavSpaceRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { space, isActive: false },
};

export const Active: Story = {
  args: { space, isActive: true },
};

export const Shared: Story = {
  args: { space: { ...space, tag: 'BET', name: 'Beta', shared: true }, isActive: false },
};

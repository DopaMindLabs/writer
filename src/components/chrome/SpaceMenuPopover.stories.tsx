import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import type { Space } from '@/db/schema';
import { SpaceMenuPopover } from './SpaceMenuPopover';

const space: Space = {
  id: 's1',
  tag: 'TST',
  name: 'Test Space',
  shared: false,
  template: 'blank',
  createdAt: 0,
  updatedAt: 0,
};

const meta = {
  title: 'Navigation/SpaceMenuPopover',
  component: SpaceMenuPopover,
  parameters: { layout: 'centered' },
  args: { space, onRename: fn() },
  decorators: [
    (Story) => (
      <div className="border border-rule">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SpaceMenuPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SharedSpace: Story = {
  args: { space: { ...space, name: 'Shared Project', shared: true } },
};

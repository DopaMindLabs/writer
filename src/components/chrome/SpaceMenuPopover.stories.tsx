import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import type { Space } from '@/db/schema';
import { asOperationId, asPrincipalId } from '@/lib/syncProviders/ids';
import { SpaceMenuPopover } from './SpaceMenuPopover';

const entityMetadata = {
  accessScopeId: 's1',
  createdBy: asPrincipalId('me'),
  updatedBy: asPrincipalId('me'),
  mutationId: asOperationId('op-1'),
  logicalUpdatedAt: { millis: 0, counter: 0 },
};

const space: Space = {
  ...entityMetadata,
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

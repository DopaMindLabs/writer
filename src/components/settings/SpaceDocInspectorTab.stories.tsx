import type { Meta, StoryObj } from '@storybook/react-vite';
import { asOperationId, asPrincipalId } from '@/lib/syncProviders/ids';
import { SpaceDocInspectorTab } from './SpaceDocInspectorTab';

const entityMetadata = {
  accessScopeId: 's1',
  createdBy: asPrincipalId('me'),
  updatedBy: asPrincipalId('me'),
  mutationId: asOperationId('op-1'),
  logicalUpdatedAt: { millis: 0, counter: 0 },
};

const meta = {
  title: 'Settings/SpaceDocInspectorTab',
  component: SpaceDocInspectorTab,
  args: {
    space: {
      ...entityMetadata,
      id: 's1',
      tag: 'SP',
      name: 'Space',
      shared: false,
      template: 'fiction',
      createdAt: 0,
      updatedAt: 0,
    },
  },
} satisfies Meta<typeof SpaceDocInspectorTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

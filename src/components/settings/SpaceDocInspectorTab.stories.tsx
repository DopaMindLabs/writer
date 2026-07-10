import type { Meta, StoryObj } from '@storybook/react-vite';
import { SpaceDocInspectorTab } from './SpaceDocInspectorTab';

const meta = {
  title: 'Settings/SpaceDocInspectorTab',
  component: SpaceDocInspectorTab,
  args: {
    space: {
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

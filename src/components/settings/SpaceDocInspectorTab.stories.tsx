import type { Meta, StoryObj } from '@storybook/react-vite';
import { sampleSpace } from '@/test/fixtures';
import { SpaceDocInspectorTab } from './SpaceDocInspectorTab';

const meta = {
  title: 'Settings/SpaceDocInspectorTab',
  component: SpaceDocInspectorTab,
  args: {
    space: {
      ...sampleSpace,
      tag: 'SP',
      name: 'Space',
      template: 'fiction',
    },
  },
} satisfies Meta<typeof SpaceDocInspectorTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

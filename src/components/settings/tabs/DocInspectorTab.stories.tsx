import type { Meta, StoryObj } from '@storybook/react-vite';
import { DocInspectorTab } from './DocInspectorTab';

const meta = {
  title: 'Settings/DocInspectorTab',
  component: DocInspectorTab,
} satisfies Meta<typeof DocInspectorTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { DocInspectorIcons } from './DocInspectorIcons';

const meta = {
  title: 'Navigation/DocInspectorIcons',
  component: DocInspectorIcons,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex h-[320px] justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DocInspectorIcons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

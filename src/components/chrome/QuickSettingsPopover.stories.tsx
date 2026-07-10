import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuickSettingsPopover } from './QuickSettingsPopover';

const meta = {
  title: 'Navigation/QuickSettingsPopover',
  component: QuickSettingsPopover,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="border border-rule">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QuickSettingsPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuickSettingsPopover } from './QuickSettingsPopover';

// The quick-settings panel rendered inside the rail/topbar popovers. It reads
// theme/reading-width/focus state from the `useUI` store and the router search
// params; the defaults render the full panel without a seed.

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

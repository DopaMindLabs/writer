import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuickSettingsSheetSection } from './QuickSettingsSheetSection';

const meta = {
  title: 'Navigation/QuickSettingsSheetSection',
  component: QuickSettingsSheetSection,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="w-[390px] border-x border-rule bg-paper">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QuickSettingsSheetSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/Button';
import { SettingRow } from './SettingRow';

const meta = {
  title: 'Settings/SettingRow',
  component: SettingRow,
  parameters: { layout: 'padded' },
  args: { label: 'Compact density' },
} satisfies Meta<typeof SettingRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHint: Story = {
  render: (args) => (
    <div className="w-[560px]">
      <SettingRow {...args} hint="Tighter spacing across the app.">
        <Button kind="secondary" size="sm">
          Toggle
        </Button>
      </SettingRow>
    </div>
  ),
};

export const NoHint: Story = {
  render: (args) => (
    <div className="w-[560px]">
      <SettingRow {...args}>
        <Button kind="secondary" size="sm">
          Toggle
        </Button>
      </SettingRow>
    </div>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <div className="w-[560px]">
      <SettingRow {...args} hint="Coming soon." disabled>
        <Button kind="secondary" size="sm" disabled>
          Toggle
        </Button>
      </SettingRow>
    </div>
  ),
};

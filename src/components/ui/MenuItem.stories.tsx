import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copy, Pencil, Save } from '@/components/libs/icons';
import { MenuItem } from './MenuItem';
import { Separator } from './separator';

const meta = {
  title: 'Atoms/MenuItem',
  component: MenuItem,
  args: { label: 'Rename' },
  argTypes: {
    danger: { control: 'boolean' },
    disabled: { control: 'boolean' },
    checked: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div className="w-60 border border-rule bg-paper py-1.5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MenuItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithIcon: Story = {
  args: { label: 'Rename', icon: Pencil },
};

export const WithShortcut: Story = {
  args: { label: 'Save version', icon: Save, shortcut: 'S' },
};

export const Checked: Story = {
  args: { label: 'Medium', checked: true },
};

export const LeadingCheck: Story = {
  render: () => (
    <>
      <MenuItem label="Welcome tour" checked checkPosition="leading" shortcut="?" />
      <MenuItem label="Writing tour" checkPosition="leading" />
      <MenuItem label="Citations tour" checkPosition="leading" />
    </>
  ),
};

export const Disabled: Story = {
  args: { label: 'Two-column', disabled: true },
};

export const DangerUnderDivider: Story = {
  render: () => (
    <>
      <MenuItem label="Duplicate" icon={Copy} shortcut="D" />
      <Separator />
      <MenuItem label="Delete document" danger />
    </>
  ),
};

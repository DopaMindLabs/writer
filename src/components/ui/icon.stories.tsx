import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search, Settings, Plus, Trash2 } from '@/components/libs/icons';
import { Icon, IconButton } from './icon';

const meta = {
  title: 'Atoms/Icon',
  component: Icon,
  parameters: { layout: 'padded' },
  args: { icon: Search, size: 'sm' },
  argTypes: {
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md'] },
    strokeWidth: { control: { type: 'number', min: 1, max: 3, step: 0.25 } },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Icon icon={Search} size="xs" />
      <Icon icon={Search} size="sm" />
      <Icon icon={Search} size="md" />
    </div>
  ),
};

export const Buttons: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <IconButton icon={Settings} label="Settings" />
      <IconButton icon={Plus} label="Add" buttonSize="md" />
      <IconButton icon={Trash2} label="Delete" active />
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';

const meta = {
  title: 'Atoms/Input',
  component: Input,
  parameters: { layout: 'padded' },
  args: { placeholder: 'Type here…' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <Input {...args} className="w-72" />,
};

export const Filled: Story = {
  render: (args) => <Input {...args} defaultValue="Drafted title" className="w-72" />,
};

export const Disabled: Story = {
  render: (args) => <Input {...args} disabled className="w-72" />,
};

export const Password: Story = {
  render: (args) => (
    <Input {...args} type="password" defaultValue="secret" className="w-72" />
  ),
};

export const Matrix: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <Input placeholder="empty" />
      <Input defaultValue="filled" />
      <Input disabled placeholder="disabled" />
    </div>
  ),
};

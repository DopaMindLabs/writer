import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './TextField';

const meta = {
  title: 'Forms/TextField',
  component: TextField,
  args: { placeholder: 'title…' },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};
export const Filled: Story = { args: { defaultValue: 'On reading slowly' } };
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = {
  args: { defaultValue: 'invalid value', error: true },
};

export const Matrix: Story = {
  render: () => (
    <div className="grid w-80 gap-4">
      <TextField placeholder="rest (empty)" />
      <TextField defaultValue="rest (filled)" />
      <TextField defaultValue="autofocus to see focus state" autoFocus />
      <TextField placeholder="disabled" disabled />
      <TextField defaultValue="failed" error />
    </div>
  ),
};

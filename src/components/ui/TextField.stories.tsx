import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './TextField';

const meta = {
  title: 'Forms/TextField',
  component: TextField,
  args: { placeholder: 'title…' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['baseline', 'bare'] },
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};
export const Filled: Story = { args: { defaultValue: 'On reading slowly' } };
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = {
  args: { defaultValue: 'invalid value', error: true },
};

export const Bare: Story = {
  args: {
    variant: 'bare',
    defaultValue: 'borderless inline edit',
    className: 'font-serif text-[18px] font-medium',
  },
};

export const InlineEdit: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
        sidebar space name
      </div>
      <TextField
        variant="bare"
        defaultValue="On reading slowly"
        className="font-serif text-lg font-medium leading-tight tracking-tight"
      />
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3 pt-4">
        topbar doc name
      </div>
      <TextField
        variant="bare"
        defaultValue="The bell-keeper"
        className="w-40 font-serif text-[14px] font-medium"
      />
    </div>
  ),
};

export const Matrix: Story = {
  render: () => (
    <div className="grid w-80 gap-4">
      <TextField placeholder="baseline · rest" />
      <TextField defaultValue="baseline · filled" />
      <TextField defaultValue="baseline · autofocus" autoFocus />
      <TextField placeholder="baseline · disabled" disabled />
      <TextField defaultValue="baseline · error" error />
      <TextField variant="bare" placeholder="bare · rest" />
      <TextField variant="bare" defaultValue="bare · filled" />
      <TextField variant="bare" placeholder="bare · disabled" disabled />
      <TextField variant="bare" defaultValue="bare · error" error />
    </div>
  ),
};

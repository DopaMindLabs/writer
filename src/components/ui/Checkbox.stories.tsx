import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Forms/Checkbox',
  component: Checkbox,
  args: { label: 'Sync to cloud' },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};
export const Checked: Story = { args: { defaultChecked: true } };
export const Disabled: Story = { args: { disabled: true } };
export const CheckedDisabled: Story = {
  args: { defaultChecked: true, disabled: true },
};

export const Controlled: Story = {
  render: (args) => {
    const Controlled = () => {
      const [on, setOn] = useState(false);
      return (
        <Checkbox
          {...args}
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          label={`${args.label} — ${on ? 'on' : 'off'}`}
        />
      );
    };
    return <Controlled />;
  },
};

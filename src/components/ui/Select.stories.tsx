import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Select, type SelectOption } from './Select';

const THEMES: SelectOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'hc-light', label: 'High contrast (light)' },
  { value: 'hc-dark', label: 'High contrast (dark)' },
  { value: 'system', label: 'Match system' },
];

const meta = {
  title: 'Forms/Select',
  component: Select,
  args: { options: THEMES },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = { args: { error: true, defaultValue: 'dark' } };

export const Controlled: Story = {
  render: (args) => {
    const Controlled = () => {
      const [v, setV] = useState('dark');
      return (
        <div className="w-72">
          <Select
            {...args}
            value={v}
            onChange={(e) => setV(e.target.value)}
          />
          <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
            selected: {v}
          </div>
        </div>
      );
    };
    return <Controlled />;
  },
};

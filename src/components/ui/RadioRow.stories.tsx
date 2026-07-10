import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { RadioRow, type RadioOption } from './RadioRow';

const THEMES: RadioOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match system' },
];

const meta = {
  title: 'Forms/RadioRow',
  component: RadioRow,
  args: { name: 'theme', options: THEMES, value: 'light', onChange: () => {} },
} satisfies Meta<typeof RadioRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DarkActive: Story = { args: { value: 'dark' } };
export const Disabled: Story = { args: { disabled: true } };

export const Controlled: Story = {
  render: (args) => {
    const Controlled = () => {
      const [v, setV] = useState('light');
      return (
        <div className="space-y-2">
          <RadioRow {...args} value={v} onChange={setV} />
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
            selected: {v}
          </div>
        </div>
      );
    };
    return <Controlled />;
  },
};

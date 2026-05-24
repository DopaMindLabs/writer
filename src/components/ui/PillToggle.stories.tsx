import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PillToggle } from './PillToggle';

const meta = {
  title: 'Atoms/PillToggle',
  component: PillToggle,
} satisfies Meta<typeof PillToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
  args: { on: false, label: 'Focus mode', onToggle: () => {} },
};

export const On: Story = {
  args: { on: true, label: 'Focus mode', onToggle: () => {} },
};

export const Interactive: Story = {
  render: () => {
    const Stateful = () => {
      const [on, setOn] = useState(false);
      return (
        <PillToggle on={on} label="Focus mode" onToggle={() => setOn(!on)} />
      );
    };
    return <Stateful />;
  },
};

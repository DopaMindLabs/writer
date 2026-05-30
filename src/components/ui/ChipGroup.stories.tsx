import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChipGroup } from './ChipGroup';

const meta = {
  title: 'Atoms/ChipGroup',
  component: ChipGroup,
  args: { options: ['Light', 'Dark'], active: 0 },
} satisfies Meta<typeof ChipGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Theme: Story = {
  args: { options: ['Light', 'Dark'], active: 0, label: 'Theme' },
};

export const ReadingWidth: Story = {
  args: { options: ['S', 'M', 'L'], active: 1, label: 'Reading width' },
};

export const Mode: Story = {
  args: { options: ['Write', 'Focus', 'Read'], active: 2, label: 'Mode' },
};

export const Interactive: Story = {
  render: () => {
    const Stateful = () => {
      const [active, setActive] = useState(0);
      return (
        <ChipGroup
          options={['Write', 'Focus', 'Read']}
          active={active}
          onChange={setActive}
          label="Mode"
        />
      );
    };
    return <Stateful />;
  },
};

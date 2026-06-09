import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { INHERIT_INTERVAL } from '@/lib/sync/folderSync';
import { IntervalSelector } from './IntervalSelector';

const meta = {
  title: 'Settings/Sync/IntervalSelector',
  component: IntervalSelector,
  parameters: { layout: 'padded' },
  args: { ariaLabel: 'Auto-sync interval', value: 10, onChange: () => undefined },
} satisfies Meta<typeof IntervalSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const Demo = () => {
      const [value, setValue] = useState(10);
      return <IntervalSelector {...args} value={value} onChange={setValue} />;
    };
    return <Demo />;
  },
};

export const WithInheritChip: Story = {
  render: (args) => {
    const Demo = () => {
      const [value, setValue] = useState<number>(INHERIT_INTERVAL);
      return (
        <IntervalSelector
          {...args}
          value={value}
          onChange={setValue}
          inheritLabel="Default (10 min)"
        />
      );
    };
    return <Demo />;
  },
};

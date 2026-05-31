import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DeleteConfirmField } from './DeleteConfirmField';

const meta = {
  title: 'Settings/DeleteConfirmField',
  component: DeleteConfirmField,
  parameters: { layout: 'padded' },
  args: {
    label: 'Type "Novel" to confirm',
    testId: 'delete-confirm',
  },
} satisfies Meta<typeof DeleteConfirmField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const Demo = () => {
      const [value, setValue] = useState('');
      return (
        <div className="w-80">
          <DeleteConfirmField {...args} value={value} onChange={setValue} />
        </div>
      );
    };
    return <Demo />;
  },
};

export const Filled: Story = {
  render: (args) => {
    const Demo = () => {
      const [value, setValue] = useState('Novel');
      return (
        <div className="w-80">
          <DeleteConfirmField {...args} value={value} onChange={setValue} />
        </div>
      );
    };
    return <Demo />;
  },
};

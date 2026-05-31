import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SearchField } from './SearchField';

const meta = {
  title: 'Forms/SearchField',
  component: SearchField,
  args: { placeholder: 'title, writer, or call number…' },
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { defaultValue: 'bell-keeper' } };
export const Disabled: Story = { args: { disabled: true } };

export const Controlled: Story = {
  render: (args) => {
    const Controlled = () => {
      const [v, setV] = useState('the lighthouse');
      return (
        <div className="w-80">
          <SearchField
            {...args}
            value={v}
            onChange={(e) => { setV(e.target.value); }}
            onClear={() => { setV(''); }}
          />
        </div>
      );
    };
    return <Controlled />;
  },
};

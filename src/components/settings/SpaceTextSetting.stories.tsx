import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SpaceTextSetting } from './SpaceTextSetting';

const meta = {
  title: 'Settings/SpaceTextSetting',
  component: SpaceTextSetting,
  parameters: { layout: 'padded' },
  args: {
    label: 'Space name',
    hint: 'Shown in the rail and the title bar.',
    ariaLabel: 'Space name',
    testId: 'space-name',
  },
} satisfies Meta<typeof SpaceTextSetting>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const Demo = () => {
      const [value, setValue] = useState('Novel');
      return (
        <div className="w-[560px]">
          <SpaceTextSetting
            {...args}
            value={value}
            onChange={setValue}
            onCommit={() => undefined}
            onReset={() => {
              setValue('Novel');
            }}
          />
        </div>
      );
    };
    return <Demo />;
  },
};

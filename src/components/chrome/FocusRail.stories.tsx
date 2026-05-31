import type { Meta, StoryObj } from '@storybook/react-vite';
import { FocusRail } from './FocusRail';

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/FocusRail',
  component: FocusRail,
  parameters: { layout: 'fullscreen', seed: 'multipleSpaces' },
  decorators: [
    (Story) => (
      <div className="flex h-[420px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FocusRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { activeSpaceId: 's1' },
};

export const NoActiveSpace: Story = {
  args: { activeSpaceId: null },
};

export const SingleSpace: Story = {
  parameters: { seed: 'basicSpace' },
  args: { activeSpaceId: 's1' },
};

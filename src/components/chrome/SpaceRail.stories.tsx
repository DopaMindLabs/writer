import type { Meta, StoryObj } from '@storybook/react-vite';
import { SpaceRail } from './SpaceRail';

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/SpaceRail',
  component: SpaceRail,
  parameters: { layout: 'fullscreen', seed: 'multipleSpaces' },
  decorators: [
    (Story) => (
      <div className="flex h-[480px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SpaceRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { activeSpaceId: 's1' },
};

export const SharedSpaceActive: Story = {
  args: { activeSpaceId: 's2' },
};

export const NoActiveSpace: Story = {
  args: { activeSpaceId: null },
};

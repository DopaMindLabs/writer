import type { Meta, StoryObj } from '@storybook/react-vite';
import { SpaceRail } from './SpaceRail';

// SpaceRail lists spaces from Dexie via the `useSpaces` hook, so the stories
// opt into a seed. `multipleSpaces` seeds three spaces (one shared) to exercise
// the active state and the shared-dot indicator.

const meta = {
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

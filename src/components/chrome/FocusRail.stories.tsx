import type { Meta, StoryObj } from '@storybook/react-vite';
import { FocusRail } from './FocusRail';

// FocusRail lists spaces from Dexie via the `useSpaces` hook, so the stories
// opt into a seed. The rail is a tall full-height aside, framed accordingly.

const meta = {
  // Seeded stories share one Dexie DB and cannot represent distinct seed
  // states side by side, so they opt out of the combined autodocs gallery and
  // are viewed one at a time in the canvas (where the per-story reseed holds).
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

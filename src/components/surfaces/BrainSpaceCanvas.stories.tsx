import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrainSpaceCanvas } from './BrainSpaceCanvas';

const meta = {
  title: 'Surfaces/BrainSpaceCanvas',
  component: BrainSpaceCanvas,
  parameters: { layout: 'fullscreen' },
  // The canvas fills its parent; give it a sized frame in the gallery.
  decorators: [
    (Story) => (
      <div className="h-[520px] w-full border border-rule">
        <Story />
      </div>
    ),
  ],
  args: { spaceId: 's1' },
} satisfies Meta<typeof BrainSpaceCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

// Populated with two seeded notes (n1, n2) and a connection (c1).
export const Populated: Story = {
  parameters: { seed: 'brainSpace' },
};

// No seed: the canvas shows its "start dumping" empty state and the toolbar.
export const Empty: Story = {
  parameters: { seed: 'basicSpace' },
  args: { spaceId: 'does-not-exist' },
};

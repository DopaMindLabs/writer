import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrainSpaceCanvas } from './BrainSpaceCanvas';

const meta = {
  tags: ['!autodocs'],
  title: 'Surfaces/BrainSpaceCanvas',
  component: BrainSpaceCanvas,
  parameters: { layout: 'fullscreen' },
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

export const Populated: Story = {
  parameters: { seed: 'brainSpace' },
};

export const Empty: Story = {
  parameters: { seed: 'basicSpace' },
  args: { spaceId: 'does-not-exist' },
};

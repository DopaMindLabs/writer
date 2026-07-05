import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrainSpaceLink } from './BrainSpaceLink';

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/BrainSpaceLink',
  component: BrainSpaceLink,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="w-56 border-r border-rule bg-paper-2 py-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BrainSpaceLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithNotes: Story = {
  args: { spaceId: 's1', active: false, count: 12 },
};

export const Active: Story = {
  args: { spaceId: 's1', active: true, count: 12 },
};

export const Empty: Story = {
  args: { spaceId: 's1', active: false, count: 0 },
};

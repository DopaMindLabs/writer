import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaLibraryLink } from './MediaLibraryLink';

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/MediaLibraryLink',
  component: MediaLibraryLink,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="w-56 border-r border-rule bg-paper-2 py-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MediaLibraryLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { spaceId: 's1', active: false },
};

export const Active: Story = {
  args: { spaceId: 's1', active: true },
};

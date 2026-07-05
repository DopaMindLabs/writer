import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorkshopLinks } from './WorkshopLinks';

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/WorkshopLinks',
  component: WorkshopLinks,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="w-56 border-r border-rule bg-paper-2 py-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WorkshopLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    spaceId: 's1',
    onBrainSpace: false,
    onMediaLibrary: false,
    notesCount: 12,
  },
};

export const BrainSpaceActive: Story = {
  args: {
    spaceId: 's1',
    onBrainSpace: true,
    onMediaLibrary: false,
    notesCount: 12,
  },
};

export const LibraryActive: Story = {
  args: {
    spaceId: 's1',
    onBrainSpace: false,
    onMediaLibrary: true,
    notesCount: 0,
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { MediaRowMenu } from './MediaRowMenu';

const noop = (): void => undefined;

const item: MediaItem = {
  id: 'm1',
  spaceId: 's1',
  name: 'thesis.pdf',
  mime: PDF_MIME,
  size: 2 * 1024 * 1024,
  pageCount: 12,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: 1,
  updatedAt: 1,
};

const meta = {
  tags: ['!autodocs'],
  title: 'Media/MediaRowMenu',
  component: MediaRowMenu,
  args: { item, onOpen: noop },
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="group flex w-40 justify-end bg-paper p-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MediaRowMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Menu: Story = {};

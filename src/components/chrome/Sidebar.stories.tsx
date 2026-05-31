import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar } from './Sidebar';

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/Sidebar',
  component: Sidebar,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
  decorators: [
    (Story) => (
      <div className="flex h-[520px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { spaceId: 's1', activeDocId: 'd1' },
};

export const NoActiveDoc: Story = {
  args: { spaceId: 's1', activeDocId: null },
};

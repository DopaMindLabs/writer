import type { Meta, StoryObj } from '@storybook/react-vite';
import { Topbar } from './Topbar';

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/Topbar',
  component: Topbar,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
} satisfies Meta<typeof Topbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Write: Story = {
  args: {
    spaceId: 's1',
    docId: 'd1',
    docName: 'Sample Doc',
    spaceName: 'Test Space',
    mode: 'write',
  },
};

export const Read: Story = {
  args: {
    spaceId: 's1',
    docId: 'd1',
    docName: 'Sample Doc',
    spaceName: 'Test Space',
    mode: 'read',
  },
};

export const SpaceLevel: Story = {
  args: {
    spaceId: 's1',
    docId: null,
    spaceName: 'Test Space',
    mode: 'dump',
  },
};

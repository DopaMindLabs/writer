import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import type { Doc } from '@/db/schema';
import { DocRowMenu } from './DocRowMenu';

const sampleDoc: Doc = {
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Sample Doc',
  body: '',
  meta: { wordCount: 0 },
  updatedAt: 0,
};

const meta = {
  tags: ['!autodocs'],
  title: 'Navigation/DocRowMenu',
  component: DocRowMenu,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
  args: { doc: sampleDoc, active: false, onRename: fn(), canManage: true },
} satisfies Meta<typeof DocRowMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

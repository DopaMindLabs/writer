import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaSortMenu } from './MediaSortMenu';

const noop = (): void => undefined;

const meta = {
  tags: ['!autodocs'],
  title: 'Media/MediaSortMenu',
  component: MediaSortMenu,
  args: { value: 'recent', onChange: noop },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof MediaSortMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Recent: Story = {};
export const Pages: Story = { args: { value: 'pages' } };

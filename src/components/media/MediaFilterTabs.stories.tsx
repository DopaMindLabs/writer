import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaFilterTabs } from './MediaFilterTabs';

const noop = (): void => undefined;

const meta = {
  tags: ['!autodocs'],
  title: 'Media/MediaFilterTabs',
  component: MediaFilterTabs,
  args: { value: 'all', onChange: noop },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof MediaFilterTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {};
export const Annotated: Story = { args: { value: 'annotated' } };

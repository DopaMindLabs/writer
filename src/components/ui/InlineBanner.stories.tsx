import type { Meta, StoryObj } from '@storybook/react-vite';
import { InlineBanner } from './InlineBanner';

const meta = {
  title: 'Status/InlineBanner',
  component: InlineBanner,
  args: {
    kind: 'info',
    title: 'Heads up',
    children: 'A neutral notice with a little more detail beneath the title.',
  },
  argTypes: {
    kind: {
      control: 'inline-radio',
      options: ['error', 'warning', 'success', 'info'],
    },
    dismissible: { control: 'boolean' },
  },
} satisfies Meta<typeof InlineBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Reconnect: Story = {
  args: {
    kind: 'warning',
    title: 'Folder access paused',
    children: 'Grant access again to resume manual and scheduled sync.',
    action: 'Reconnect',
  },
};

export const Dismissible: Story = {
  args: { kind: 'success', title: 'Imported', children: '12 files imported.', dismissible: true },
};

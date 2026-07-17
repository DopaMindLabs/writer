import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudKeyErrorScreen } from './CloudKeyErrorScreen';

const meta = {
  title: 'Errors/CloudKeyErrorScreen',
  component: CloudKeyErrorScreen,
  args: {
    onUnlock: () => undefined,
    onReset: () => Promise.resolve(),
  },
} satisfies Meta<typeof CloudKeyErrorScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ResetFailed: Story = {
  args: {
    onReset: () => Promise.reject(new Error('reset failed')),
  },
};

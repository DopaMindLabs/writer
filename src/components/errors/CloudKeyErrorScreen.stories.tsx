import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudKeyErrorScreen } from './CloudKeyErrorScreen';

const meta = {
  title: 'Errors/CloudKeyErrorScreen',
  component: CloudKeyErrorScreen,
  args: {
    onUnlock: () => undefined,
    onReset: () => undefined,
  },
} satisfies Meta<typeof CloudKeyErrorScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

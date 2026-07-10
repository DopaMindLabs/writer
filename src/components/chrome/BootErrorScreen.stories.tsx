import type { Meta, StoryObj } from '@storybook/react-vite';
import { BootErrorScreen } from './BootErrorScreen';

const meta = {
  title: 'Chrome/BootErrorScreen',
  component: BootErrorScreen,
  parameters: { layout: 'fullscreen' },
  tags: ['!autodocs'],
} satisfies Meta<typeof BootErrorScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    error: new Error('IndexedDB is unavailable in this browser profile.'),
    onReset: () => undefined,
  },
  render: (args) => (
    <div className="h-screen">
      <BootErrorScreen {...args} />
    </div>
  ),
};

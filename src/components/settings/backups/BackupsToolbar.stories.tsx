import type { Meta, StoryObj } from '@storybook/react-vite';
import { BackupsToolbar } from './BackupsToolbar';

const meta = {
  title: 'Settings/Backups/BackupsToolbar',
  component: BackupsToolbar,
  parameters: { layout: 'padded' },
  args: {
    busy: false,
    onSnapshot: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-[640px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BackupsToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Busy: Story = {
  args: { busy: true },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudDeviceResetControl } from './CloudDeviceResetControl';

const meta = {
  title: 'Errors/CloudDeviceResetControl',
  component: CloudDeviceResetControl,
  decorators: [
    (Story) => (
      <div className="flex max-w-md flex-col gap-2 p-6">
        <Story />
      </div>
    ),
  ],
  args: { onReset: () => Promise.resolve() },
} satisfies Meta<typeof CloudDeviceResetControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ResetFails: Story = {
  args: { onReset: () => Promise.reject(new Error('reset failed')) },
};

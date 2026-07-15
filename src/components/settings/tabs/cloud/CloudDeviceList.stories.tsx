import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudDeviceList } from './CloudDeviceList';

/**
 * The list reads the live registry through `useDeviceList`, so these stories show
 * the surface as a signed-in device sees it. The registry is empty in Storybook,
 * which is itself the state worth reviewing: the empty case.
 */
const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudDeviceList',
  component: CloudDeviceList,
  args: { onSignOut: () => undefined },
  decorators: [
    (Story) => (
      <div className="w-[32rem]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CloudDeviceList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

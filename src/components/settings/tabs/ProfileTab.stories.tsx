import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProfileTab } from './ProfileTab';

const meta = {
  title: 'Settings/ProfileTab',
  component: ProfileTab,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="max-w-[880px] p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

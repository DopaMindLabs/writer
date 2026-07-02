import type { Meta, StoryObj } from '@storybook/react-vite';
import { AccountTab } from './AccountTab';

const meta = {
  title: 'Settings/AccountTab',
  component: AccountTab,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="max-w-[880px] p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AccountTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

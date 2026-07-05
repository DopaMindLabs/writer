import type { Meta, StoryObj } from '@storybook/react-vite';
import { AboutTab } from './AboutTab';

const meta = {
  title: 'Settings/Tabs/AboutTab',
  component: AboutTab,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="max-w-[880px] p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AboutTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

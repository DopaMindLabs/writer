import type { Meta, StoryObj } from '@storybook/react-vite';
import { MobileNavHeader } from './MobileNavHeader';

const meta = {
  title: 'Navigation/MobileNavHeader',
  component: MobileNavHeader,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="w-[320px] border-x border-rule bg-paper-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MobileNavHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

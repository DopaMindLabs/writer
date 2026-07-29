import type { Meta, StoryObj } from '@storybook/react-vite';
import { CrdtMountErrorBanner } from './CrdtMountErrorBanner';

const meta = {
  title: 'Surfaces/CrdtMountErrorBanner',
  component: CrdtMountErrorBanner,
  decorators: [
    (Story) => (
      <div className="max-w-[680px] p-6">
        <Story />
      </div>
    ),
  ],
  args: { onRetry: () => undefined },
} satisfies Meta<typeof CrdtMountErrorBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

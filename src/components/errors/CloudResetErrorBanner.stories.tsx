import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudResetErrorBanner } from './CloudResetErrorBanner';

const meta = {
  title: 'Errors/CloudResetErrorBanner',
  component: CloudResetErrorBanner,
  decorators: [
    (Story) => (
      <div className="max-w-md p-6">
        <Story />
      </div>
    ),
  ],
  args: { onRetry: () => undefined },
} satisfies Meta<typeof CloudResetErrorBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

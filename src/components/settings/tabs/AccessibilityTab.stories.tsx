import type { Meta, StoryObj } from '@storybook/react';
import { AccessibilityTab } from './AccessibilityTab';

const meta = {
  title: 'Settings/AccessibilityTab',
  component: AccessibilityTab,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof AccessibilityTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="mx-auto max-w-[920px]">
      <AccessibilityTab />
    </div>
  ),
};

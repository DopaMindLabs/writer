import type { Meta, StoryObj } from '@storybook/react';
import { LanguageTab } from './LanguageTab';

const meta = {
  title: 'Settings/LanguageTab',
  component: LanguageTab,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof LanguageTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="mx-auto max-w-[920px]">
      <LanguageTab />
    </div>
  ),
};

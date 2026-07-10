import type { Meta, StoryObj } from '@storybook/react';
import { SkipLink } from './SkipLink';

const meta = {
  title: 'UI/SkipLink',
  component: SkipLink,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SkipLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="p-6">
      <SkipLink />
      <p className="font-mono text-[11px] uppercase tracking-wide text-ink-3">
        Press Tab to reveal the skip link.
      </p>
      <main id="main-content" className="mt-4">
        Main content
      </main>
    </div>
  ),
};

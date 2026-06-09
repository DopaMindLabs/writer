import type { Meta, StoryObj } from '@storybook/react';
import { VisuallyHidden } from './VisuallyHidden';

const meta = {
  title: 'UI/VisuallyHidden',
  component: VisuallyHidden,
  parameters: { layout: 'centered' },
  args: { children: null },
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <p>
      Save<VisuallyHidden> your document</VisuallyHidden>
      {' — the visually-hidden text is read by screen readers only.'}
    </p>
  ),
};

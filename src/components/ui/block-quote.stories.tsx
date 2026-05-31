import type { Meta, StoryObj } from '@storybook/react-vite';
import { BlockQuote } from './block-quote';

const meta = {
  title: 'Atoms/BlockQuote',
  component: BlockQuote,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof BlockQuote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <BlockQuote className="max-w-md">
      The reasonable man adapts himself to the world; the unreasonable one
      persists in trying to adapt the world to himself.
    </BlockQuote>
  ),
};

export const WithCite: Story = {
  render: () => (
    <BlockQuote cite="— George Bernard Shaw, Man and Superman" className="max-w-md">
      The reasonable man adapts himself to the world; the unreasonable one
      persists in trying to adapt the world to himself.
    </BlockQuote>
  ),
};

export const MultiParagraph: Story = {
  render: () => (
    <BlockQuote cite="— Anonymous" className="max-w-md">
      <p>First paragraph of the quotation runs along here.</p>
      <p>And a second paragraph follows below it.</p>
    </BlockQuote>
  ),
};

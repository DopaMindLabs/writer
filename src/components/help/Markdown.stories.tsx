import type { Meta, StoryObj } from '@storybook/react-vite';
import { Markdown } from './Markdown';

const SAMPLE = `## Getting started

A short paragraph with **bold** and *italic* text, plus a link to
[Keyboard shortcuts](keyboard-shortcuts).

### A sub-heading

- First item
- Second item with \`inline code\`

> A block quote, for emphasis.
`;

const meta = {
  title: 'Help/Markdown',
  component: Markdown,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: SAMPLE },
};

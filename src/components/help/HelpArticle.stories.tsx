import type { Meta, StoryObj } from '@storybook/react-vite';
import { HelpArticle } from './HelpArticle';

const meta = {
  title: 'Help/HelpArticle',
  component: HelpArticle,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof HelpArticle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { slug: 'getting-started' },
};

export const KeyboardShortcuts: Story = {
  args: { slug: 'keyboard-shortcuts' },
};

export const NotFound: Story = {
  args: { slug: 'no-such-article' },
};

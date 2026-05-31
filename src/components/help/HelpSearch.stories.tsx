import type { Meta, StoryObj } from '@storybook/react-vite';
import { HelpSearch } from './HelpSearch';

const meta = {
  title: 'Help/HelpSearch',
  component: HelpSearch,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof HelpSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive: type a query (e.g. "bibtex", "shortcuts") to see live results.
export const Default: Story = {};

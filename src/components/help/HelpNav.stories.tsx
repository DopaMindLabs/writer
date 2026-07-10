import type { Meta, StoryObj } from '@storybook/react-vite';
import { HelpNav } from './HelpNav';

const meta = {
  title: 'Help/HelpNav',
  component: HelpNav,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof HelpNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

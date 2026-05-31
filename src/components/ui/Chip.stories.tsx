import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip } from './Chip';

const meta = {
  title: 'Atoms/Chip',
  component: Chip,
  args: { children: 'Light' },
  argTypes: {
    active: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};
export const Active: Story = { args: { active: true, children: 'Dark' } };
export const Disabled: Story = { args: { disabled: true, children: 'Sepia' } };

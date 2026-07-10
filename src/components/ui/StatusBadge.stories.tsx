import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusBadge } from './StatusBadge';

const meta = {
  title: 'Status/StatusBadge',
  component: StatusBadge,
  args: { kind: 'success', children: 'OK' },
  argTypes: {
    kind: {
      control: 'inline-radio',
      options: ['error', 'warning', 'success', 'info'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    glyph: { control: 'boolean' },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};
export const Error: Story = { args: { kind: 'error', children: 'FAILED' } };
export const Warning: Story = { args: { kind: 'warning', children: 'UNSAVED' } };
export const Info: Story = { args: { kind: 'info', children: 'DRAFT' } };
export const Medium: Story = { args: { size: 'md', children: 'OK' } };

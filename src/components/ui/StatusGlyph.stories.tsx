import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusGlyph } from './StatusGlyph';

const meta = {
  title: 'Status/StatusGlyph',
  component: StatusGlyph,
  args: { kind: 'info', children: 'noticed · 22:14' },
  argTypes: {
    kind: {
      control: 'inline-radio',
      options: ['error', 'warning', 'success', 'info'],
    },
    mono: { control: 'boolean' },
  },
} satisfies Meta<typeof StatusGlyph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = { args: { kind: 'error', children: 'failed' } };
export const Warning: Story = { args: { kind: 'warning', children: 'unsaved' } };
export const Success: Story = { args: { kind: 'success', children: 'saved' } };
export const Info: Story = {};
export const Sans: Story = {
  args: { kind: 'success', mono: false, children: 'Following' },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextArea } from './TextArea';

const meta = {
  title: 'Forms/TextArea',
  component: TextArea,
  args: { placeholder: 'leave a note…', rows: 4 },
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};
export const Filled: Story = {
  args: {
    defaultValue:
      'The bell-keeper rose before dawn, as she did every day, but today the rope frayed against her palm in a place it had never frayed before.',
  },
};
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = {
  args: { defaultValue: 'invalid abstract', error: true },
};
export const Tall: Story = { args: { rows: 8 } };

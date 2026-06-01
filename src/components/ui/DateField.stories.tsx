import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DateField } from './DateField';

const meta = {
  title: 'Forms/DateField',
  component: DateField,
  args: { 'aria-label': 'Due date', onChange: fn() },
} satisfies Meta<typeof DateField>;

export default meta;
type Story = StoryObj<typeof meta>;

const EPOCH = new Date(2026, 2, 14).getTime();

export const Empty: Story = {};
export const Filled: Story = { args: { value: EPOCH } };
export const Disabled: Story = { args: { value: EPOCH, disabled: true } };
export const Error: Story = { args: { value: EPOCH, error: true } };

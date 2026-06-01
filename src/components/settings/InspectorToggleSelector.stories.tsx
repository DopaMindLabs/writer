import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { InspectorToggleSelector } from './InspectorToggleSelector';

const meta = {
  title: 'Settings/InspectorToggleSelector',
  component: InspectorToggleSelector,
  args: { ariaLabel: 'Status', defaultOn: true, onChange: fn() },
} satisfies Meta<typeof InspectorToggleSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inherit: Story = { args: { value: 'inherit' } };
export const On: Story = { args: { value: 'on' } };
export const Off: Story = { args: { value: 'off' } };
export const InheritsOff: Story = { args: { value: 'inherit', defaultOn: false } };

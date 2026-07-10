import type { Meta, StoryObj } from '@storybook/react-vite';
import { TemplatesFooterActions } from './TemplatesFooterActions';

const meta = {
  tags: ['!autodocs'],
  title: 'Templates/TemplatesFooterActions',
  component: TemplatesFooterActions,
  args: { submitting: false, canSubmit: true, submitLabel: 'Enter Blank' },
} satisfies Meta<typeof TemplatesFooterActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Disabled: Story = { args: { canSubmit: false } };
export const Submitting: Story = { args: { submitting: true } };

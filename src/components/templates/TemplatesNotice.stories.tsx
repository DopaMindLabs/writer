import type { Meta, StoryObj } from '@storybook/react-vite';
import { TemplatesNotice } from './TemplatesNotice';

const meta = {
  tags: ['!autodocs'],
  title: 'Templates/TemplatesNotice',
  component: TemplatesNotice,
  args: { lockReason: 'none', submitError: null },
} satisfies Meta<typeof TemplatesNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mismatch: Story = { args: { lockReason: 'mismatch' } };
export const Keyless: Story = { args: { lockReason: 'keyless' } };
export const Locked: Story = { args: { submitError: 'locked' } };
export const Failed: Story = { args: { submitError: 'failed' } };

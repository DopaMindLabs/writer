import type { Meta, StoryObj } from '@storybook/react-vite';
import { JournalRetentionSelector } from './JournalRetentionSelector';

const meta = {
  title: 'Settings/JournalRetentionSelector',
  component: JournalRetentionSelector,
  args: { value: 30, onChange: () => undefined, ariaLabel: 'Keep sync history for' },
} satisfies Meta<typeof JournalRetentionSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default window: thirty days. */
export const Default: Story = {};

export const LongWindow: Story = { args: { value: 365 } };

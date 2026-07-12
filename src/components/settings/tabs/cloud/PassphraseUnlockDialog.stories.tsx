import type { Meta, StoryObj } from '@storybook/react-vite';
import { PassphraseUnlockDialog } from './PassphraseUnlockDialog';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/PassphraseUnlockDialog',
  component: PassphraseUnlockDialog,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: () => {},
    onUnlocked: () => {},
    onUnlock: () => Promise.resolve(),
    onRecover: () => Promise.resolve(),
  },
} satisfies Meta<typeof PassphraseUnlockDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

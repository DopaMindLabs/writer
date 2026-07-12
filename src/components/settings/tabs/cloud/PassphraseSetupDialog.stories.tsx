import type { Meta, StoryObj } from '@storybook/react-vite';
import { PassphraseSetupDialog } from './PassphraseSetupDialog';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/PassphraseSetupDialog',
  component: PassphraseSetupDialog,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onOpenChange: () => {},
    onRecoveryCode: () => {},
    onCreate: () => Promise.resolve('AB12-CD34-EF56'),
  },
} satisfies Meta<typeof PassphraseSetupDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

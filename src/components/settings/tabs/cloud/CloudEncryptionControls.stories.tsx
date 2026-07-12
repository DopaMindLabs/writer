import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudEncryptionControls } from './CloudEncryptionControls';

const noop = () => {};

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudEncryptionControls',
  component: CloudEncryptionControls,
  args: {
    hasKey: false,
    signedIn: false,
    onSetUp: noop,
    onUnlock: noop,
    onSignIn: noop,
    onSignOut: noop,
    onForget: noop,
  },
} satisfies Meta<typeof CloudEncryptionControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Keyless: Story = {};
export const KeylessSignedIn: Story = { args: { signedIn: true } };
export const KeyedSignedOut: Story = { args: { hasKey: true } };
export const SignedIn: Story = { args: { hasKey: true, signedIn: true } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudKeylessAccountSection } from './CloudKeylessAccountSection';
import { KeyEscrowPresence } from '@/lib/syncProviders/types';

const noop = () => {};

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudKeylessAccountSection',
  component: CloudKeylessAccountSection,
  args: { presence: KeyEscrowPresence.Unknown, syncPhase: 'pulling', onUnlock: noop, onSetUp: noop, onRetry: noop },
} satisfies Meta<typeof CloudKeylessAccountSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checking: Story = {};
export const FetchFailed: Story = { args: { presence: KeyEscrowPresence.Unknown, syncPhase: 'error' } };
export const Offline: Story = { args: { presence: KeyEscrowPresence.Unknown, syncPhase: 'offline' } };
export const AccountHasKey: Story = { args: { presence: KeyEscrowPresence.Present } };
export const AccountHasNoKey: Story = { args: { presence: KeyEscrowPresence.None } };

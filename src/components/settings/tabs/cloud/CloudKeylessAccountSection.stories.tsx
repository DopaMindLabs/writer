import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudKeylessAccountSection } from './CloudKeylessAccountSection';
import { KeyEscrowPresence, SyncPhase } from 'writer-sync/core';

const noop = () => {};

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudKeylessAccountSection',
  component: CloudKeylessAccountSection,
  args: { presence: KeyEscrowPresence.Unknown, syncPhase: SyncPhase.Pulling, onUnlock: noop, onSetUp: noop, onRetry: noop },
} satisfies Meta<typeof CloudKeylessAccountSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checking: Story = {};
export const FetchFailed: Story = { args: { presence: KeyEscrowPresence.Unknown, syncPhase: SyncPhase.Error } };
export const Offline: Story = { args: { presence: KeyEscrowPresence.Unknown, syncPhase: SyncPhase.Offline } };
export const AccountHasKey: Story = { args: { presence: KeyEscrowPresence.Present } };
export const AccountHasNoKey: Story = { args: { presence: KeyEscrowPresence.None } };

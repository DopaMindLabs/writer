import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudSyncStatusRow } from './CloudSyncStatusRow';
import { SyncPhase } from 'writer-sync/core';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudSyncStatusRow',
  component: CloudSyncStatusRow,
  args: { phase: SyncPhase.InSync },
} satisfies Meta<typeof CloudSyncStatusRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InSync: Story = {};
export const Pushing: Story = { args: { phase: SyncPhase.Pushing } };
export const Offline: Story = { args: { phase: SyncPhase.Offline } };
export const Error: Story = { args: { phase: SyncPhase.Error, message: 'Connection lost' } };

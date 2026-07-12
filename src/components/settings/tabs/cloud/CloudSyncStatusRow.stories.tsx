import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudSyncStatusRow } from './CloudSyncStatusRow';

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudSyncStatusRow',
  component: CloudSyncStatusRow,
  args: { phase: 'in-sync' },
} satisfies Meta<typeof CloudSyncStatusRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InSync: Story = {};
export const Pushing: Story = { args: { phase: 'pushing' } };
export const Offline: Story = { args: { phase: 'offline' } };
export const Error: Story = { args: { phase: 'error', message: 'Connection lost' } };

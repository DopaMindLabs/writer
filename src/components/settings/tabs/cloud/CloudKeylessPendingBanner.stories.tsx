import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudKeylessPendingBanner } from './CloudKeylessPendingBanner';
import { SyncPhase } from '@/lib/syncProviders/types';

const noop = () => {};

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudKeylessPendingBanner',
  component: CloudKeylessPendingBanner,
  args: { syncPhase: SyncPhase.Pulling, onRetry: noop },
} satisfies Meta<typeof CloudKeylessPendingBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checking: Story = {};
export const FetchFailed: Story = { args: { syncPhase: SyncPhase.Error } };
export const Offline: Story = { args: { syncPhase: SyncPhase.Offline } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudKeylessAccountSection } from './CloudKeylessAccountSection';

const noop = () => {};

const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudKeylessAccountSection',
  component: CloudKeylessAccountSection,
  args: { presence: 'unknown', syncPhase: 'pulling', onUnlock: noop, onSetUp: noop, onRetry: noop },
} satisfies Meta<typeof CloudKeylessAccountSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checking: Story = {};
export const FetchFailed: Story = { args: { presence: 'unknown', syncPhase: 'error' } };
export const Offline: Story = { args: { presence: 'unknown', syncPhase: 'offline' } };
export const AccountHasKey: Story = { args: { presence: 'present' } };
export const AccountHasNoKey: Story = { args: { presence: 'none' } };

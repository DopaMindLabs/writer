import type { Meta, StoryObj } from '@storybook/react-vite';
import { reconcileStatus, type ReconcileStatus } from '@/lib/cloud/reconcileStatus';
import { CloudReconcileStatusRow } from './CloudReconcileStatusRow';

const failed: ReconcileStatus = {
  state: 'failed',
  error: 'Error: could not apply pulled changes',
  trigger: 'pull',
  runId: 1,
  startedAt: 0,
  endedAt: 5,
  durationMs: 5,
  queued: false,
  scanned: 3,
  skipped: 1,
  reconciled: 1,
  failed: 1,
  activeDocLatencyMs: null,
};

/**
 * The reconcile-status row only renders when a document reconcile has failed. It
 * is now reachable by a signed-in keyless device too, so its failed-state accessible
 * markup is previewed here for the a11y addon.
 */
const meta = {
  tags: ['!autodocs'],
  title: 'Settings/Cloud/CloudReconcileStatusRow',
  component: CloudReconcileStatusRow,
  decorators: [
    (Story) => {
      reconcileStatus.set(failed);
      return <Story />;
    },
  ],
} satisfies Meta<typeof CloudReconcileStatusRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Failed: Story = {};

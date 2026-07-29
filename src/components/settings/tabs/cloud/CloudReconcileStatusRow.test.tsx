import { vi } from 'vitest';
import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { reconcileStatus, type ReconcileStatus } from '@/lib/cloud/reconcileStatus';
import * as reconcile from '@/lib/cloud/reconcile';
import { CloudReconcileStatusRow } from './CloudReconcileStatusRow';

const failedStatus: ReconcileStatus = {
  state: 'failed',
  error: 'Error: restore boom',
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

describe('CloudReconcileStatusRow', () => {
  it('renders nothing while reconciliation is healthy', () => {
    reconcileStatus.set({ state: 'idle' });
    renderWithProviders(<CloudReconcileStatusRow />);
    expect(screen.queryByTestId('cloud-reconcile-error')).toBeNull();
  });

  it('shows an error banner with a retry when reconciliation failed', async () => {
    reconcileStatus.set(failedStatus);
    const retry = vi.spyOn(reconcile, 'requestReconcile').mockImplementation(() => {});
    renderWithProviders(<CloudReconcileStatusRow />);

    expect(screen.getByTestId('cloud-reconcile-error')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(retry).toHaveBeenCalledWith('manual');

    retry.mockRestore();
    act(() => reconcileStatus.set({ state: 'idle' }));
  });
});

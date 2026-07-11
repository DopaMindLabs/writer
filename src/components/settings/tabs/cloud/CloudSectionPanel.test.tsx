import { vi, afterEach, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { CloudObservable } from '@/lib/cloud/cloudObservable';
import type { EscrowPresence, SyncState } from '@/lib/cloud/cloudClient';
import { reconcileStatus, type ReconcileStatus } from '@/lib/cloud/reconcileStatus';
import type { CloudPanelState } from './useCloudPanelState';
import { CloudSectionPanel } from './CloudSectionPanel';

const constant = <T,>(value: T): CloudObservable<T> => ({
  subscribe: (next) => {
    next(value);
    return { unsubscribe: () => {} };
  },
});

/** Mutable panel context each test sets before rendering. */
const state = {
  signedIn: false,
  hasKey: false,
  presence: 'unknown' as EscrowPresence,
  phase: 'in-sync' as SyncState['phase'],
};

vi.mock('@/lib/cloud/cloudClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/cloud/cloudClient')>();
  return {
    ...actual,
    cloudUserInteraction: () => constant(undefined),
    cloudSyncState: () => constant({ status: 'in-sync', phase: state.phase }),
    cloudCurrentUser: () => constant(state.signedIn ? { isLoggedIn: true } : undefined),
    cloudEscrowPresence: () => constant(state.presence),
  };
});

vi.mock('@/hooks/useKeyMismatch', () => ({ useKeyMismatch: () => false }));

vi.mock('./useCloudPanelState', () => ({
  useCloudPanelState: (): CloudPanelState => ({
    dialog: 'none',
    setDialog: vi.fn(),
    recoveryCode: null,
    setRecoveryCode: vi.fn(),
    hasKey: state.hasKey,
    refreshKey: vi.fn(),
    openSetup: vi.fn(),
    openUnlock: vi.fn(),
    onKeyAcquired: vi.fn(),
    signInError: null,
    onSignIn: vi.fn(),
    onSignOut: vi.fn(),
    onForget: vi.fn(),
    onRetry: vi.fn(),
  }),
}));

const failed: ReconcileStatus = {
  state: 'failed',
  error: 'boom',
  trigger: 'manual',
  runId: 1,
  startedAt: 0,
  queued: false,
  scanned: 1,
  skipped: 0,
  reconciled: 0,
  failed: 1,
  activeDocLatencyMs: null,
  endedAt: 1,
  durationMs: 1,
};

describe('CloudSectionPanel status visibility', () => {
  beforeEach(() => {
    state.signedIn = false;
    state.hasKey = false;
    state.presence = 'unknown';
    state.phase = 'in-sync';
  });

  afterEach(() => {
    reconcileStatus.set({ state: 'idle' });
  });

  it('shows sync and reconcile status to a signed-in keyless device', () => {
    state.signedIn = true;
    state.hasKey = false;
    reconcileStatus.set(failed);

    renderWithProviders(<CloudSectionPanel />);

    expect(screen.getByTestId('cloud-sync-status')).toBeInTheDocument();
    expect(screen.getByTestId('cloud-reconcile-error')).toBeInTheDocument();
  });

  it('hides the status rows on a signed-out keyless device (no cloud activity)', () => {
    state.signedIn = false;
    state.hasKey = false;
    reconcileStatus.set(failed);

    renderWithProviders(<CloudSectionPanel />);

    expect(screen.queryByTestId('cloud-sync-status')).toBeNull();
    expect(screen.queryByTestId('cloud-reconcile-error')).toBeNull();
  });

  it('still shows sync status once a device holds a key (non-regression)', () => {
    state.signedIn = false;
    state.hasKey = true;

    renderWithProviders(<CloudSectionPanel />);

    expect(screen.getByTestId('cloud-sync-status')).toBeInTheDocument();
  });
});

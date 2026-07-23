import { vi, afterEach, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { CloudObservable } from '@/lib/cloud/cloudObservable';
import type { SyncState } from '@/lib/cloud/cloudClient';
import { reconcileStatus, type ReconcileStatus } from '@/lib/cloud/reconcileStatus';
import type { CloudPanelState } from './useCloudPanelState';
import { createSyncCoordinator } from '@/lib/syncProviders/coordinator';
import type { SyncProvider } from '@/lib/syncProviders/types';
import { KeyEscrowPresence } from '@/lib/syncProviders/types';
import { WriterSyncProvider } from '@/lib/writerSync/WriterSyncProvider';
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
  presence: KeyEscrowPresence.Unknown,
  phase: 'in-sync' as SyncState['phase'],
  deviceLimitBlocked: false,
};

vi.mock('@/lib/cloud/cloudClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/cloud/cloudClient')>();
  return {
    ...actual,
    cloudUserInteraction: () => constant(undefined),
    cloudSyncState: () => constant({ status: 'in-sync', phase: state.phase }),
    cloudCurrentUser: () => constant(state.signedIn ? { isLoggedIn: true } : undefined),
  };
});

vi.mock('@/hooks/useKeyMismatch', () => ({ useKeyMismatch: () => false }));

vi.mock('./useDeviceSlots', () => ({
  useDeviceLimitBlocked: () => state.deviceLimitBlocked,
}));

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
    onSignInConfirmed: vi.fn(),
    onSignOut: vi.fn(),
    onForget: vi.fn(),
    onRetry: vi.fn(),
  }),
}));

/** Escrow presence reaches the panel through the provider, not the facade. */
const keyDeliveryProvider = (): SyncProvider => ({
  id: 'test-cloud',
  kind: 'dexie-cloud',
  keyDelivery: {
    setUp: () => Promise.resolve('code'),
    unlock: () => Promise.resolve(),
    recover: () => Promise.resolve(),
    escrowPresence: constant(state.presence),
  },
});

const renderPanel = () =>
  renderWithProviders(
    <WriterSyncProvider
      coordinator={createSyncCoordinator({
        providers: [keyDeliveryProvider()],
        defaultProviderInstanceId: 'test-cloud',
      })}
    >
      <CloudSectionPanel />
    </WriterSyncProvider>,
  );

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
    state.presence = KeyEscrowPresence.Unknown;
    state.phase = 'in-sync';
    state.deviceLimitBlocked = false;
  });

  afterEach(() => {
    reconcileStatus.set({ state: 'idle' });
  });

  it('shows sync and reconcile status to a signed-in keyless device', () => {
    state.signedIn = true;
    state.hasKey = false;
    reconcileStatus.set(failed);

    renderPanel();

    expect(screen.getByTestId('cloud-sync-status')).toBeInTheDocument();
    expect(screen.getByTestId('cloud-reconcile-error')).toBeInTheDocument();
  });

  it('hides the status rows on a signed-out keyless device (no cloud activity)', () => {
    state.signedIn = false;
    state.hasKey = false;
    reconcileStatus.set(failed);

    renderPanel();

    expect(screen.queryByTestId('cloud-sync-status')).toBeNull();
    expect(screen.queryByTestId('cloud-reconcile-error')).toBeNull();
  });

  it('still shows sync status once a device holds a key (non-regression)', () => {
    state.signedIn = false;
    state.hasKey = true;

    renderPanel();

    expect(screen.getByTestId('cloud-sync-status')).toBeInTheDocument();
  });

  it('replaces the keyless section with the hard block when the device limit is hit', () => {
    state.signedIn = true;
    state.hasKey = false;
    state.presence = KeyEscrowPresence.Present;
    state.deviceLimitBlocked = true;

    renderPanel();

    expect(screen.getByTestId('cloud-device-limit')).toBeInTheDocument();
    // No key action reachable: the unlock/set-up banners never render.
    expect(screen.queryByTestId('cloud-keyless-locked')).toBeNull();
    expect(screen.queryByTestId('cloud-keyless-nokey')).toBeNull();
    expect(screen.queryByTestId('cloud-keyless-checking')).toBeNull();
  });

  it('leaves the keyless section untouched while a slot is free (non-regression)', () => {
    state.signedIn = true;
    state.hasKey = false;
    state.presence = KeyEscrowPresence.Present;

    renderPanel();

    expect(screen.queryByTestId('cloud-device-limit')).toBeNull();
    expect(screen.getByTestId('cloud-keyless-locked')).toBeInTheDocument();
  });
});

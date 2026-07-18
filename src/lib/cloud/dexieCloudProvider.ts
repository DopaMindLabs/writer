import type { SyncState } from 'dexie-cloud-addon';
import { assertNever } from '@/lib/invariant';
import type { EncryptedFrameSync, SyncProvider, SyncStatus } from '@/lib/syncProviders/types';
import { SyncPhase } from '@/lib/syncProviders/types';
import {
  cloudSyncComplete,
  cloudSyncState,
  requestCloudSync,
  startCloudSession,
} from './cloudClient';

/**
 * Dexie Cloud as a {@link SyncProvider}.
 *
 * Pure delegation over `cloudClient` — the facade stays the only module that
 * touches `db.cloud`, and no sync logic moves here. The adapter's whole job is
 * vocabulary: mapping the addon's seven-phase sync state onto the neutral
 * phases, and passing observables through where the shapes already agree.
 *
 * Only `frameSync` is declared. `keyDelivery` is deliberately absent until
 * something consumes it: the key UI drives `setup.ts` through the facade
 * directly, so an adapter method would be unreachable code that no test could
 * honestly cover. It lands in the change that gives it a caller, as does
 * `accessControl` with the realm tables. The addon has no realtime transport or
 * peer discovery of its own, so neither is declared at all.
 */
export const DEXIE_CLOUD_PROVIDER_ID = 'dexie-cloud';

/** Map the addon's phase onto the provider-neutral one. Total by construction. */
const toSyncPhase = (phase: SyncState['phase']): SyncPhase => {
  switch (phase) {
    case 'initial':
      return SyncPhase.Initial;
    case 'not-in-sync':
      return SyncPhase.Pending;
    case 'pushing':
    case 'pulling':
      return SyncPhase.Syncing;
    case 'in-sync':
      return SyncPhase.InSync;
    case 'offline':
      return SyncPhase.Offline;
    case 'error':
      return SyncPhase.Error;
    default:
      return assertNever(phase, `Unhandled sync phase: ${String(phase)}`);
  }
};

const toSyncStatus = (state: SyncState): SyncStatus => ({
  phase: toSyncPhase(state.phase),
  error: state.error,
});

const frameSync = (): EncryptedFrameSync => ({
  start: () => startCloudSession(),
  requestSync: () => requestCloudSync(),
  status: {
    subscribe: (next) =>
      cloudSyncState().subscribe((state) => {
        next(toSyncStatus(state));
      }),
  },
  // Emits `void` either side, so the facade's observable passes straight
  // through. Resolved on subscribe, not at construction: building a provider
  // must not reach into the cloud facade before anything asks it to.
  syncComplete: {
    subscribe: (next) => cloudSyncComplete().subscribe(next),
  },
});

export const createDexieCloudProvider = (): SyncProvider => ({
  id: DEXIE_CLOUD_PROVIDER_ID,
  frameSync: frameSync(),
});

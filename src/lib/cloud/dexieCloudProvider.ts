import type { SyncState } from 'dexie-cloud-addon';
import { assertNever } from '@/lib/invariant';
import type {
  EncryptedFrameSync,
  KeyDeliveryAdapter,
  SyncProvider,
  SyncStatus,
} from '@/lib/syncProviders/types';
import { KeyEscrowPresence, SyncPhase } from '@/lib/syncProviders/types';
import type { EscrowPresence } from './cloudClient';
import {
  cloudEscrowPresence,
  cloudSyncComplete,
  cloudSyncState,
  createCloudEncryption,
  recoverCloudEncryption,
  requestCloudSync,
  startCloudSession,
  unlockCloudEncryption,
} from './cloudClient';

/**
 * Dexie Cloud as a {@link SyncProvider}.
 *
 * Pure delegation over `cloudClient` — the facade stays the only module that
 * touches `db.cloud`, and no sync logic moves here. The adapter's whole job is
 * vocabulary: mapping the addon's seven-phase sync state onto the neutral
 * phases, and passing observables through where the shapes already agree.
 *
 * `accessControl` is absent until the realm tables exist; the addon offers no
 * realtime transport or peer discovery of its own, so those stay absent too.
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

/** The facade's presence union onto the neutral enum. Total by construction. */
const toEscrowPresence = (presence: EscrowPresence): KeyEscrowPresence => {
  switch (presence) {
    case 'unknown':
      return KeyEscrowPresence.Unknown;
    case 'none':
      return KeyEscrowPresence.None;
    case 'present':
      return KeyEscrowPresence.Present;
    default:
      return assertNever(presence, `Unhandled escrow presence: ${String(presence)}`);
  }
};

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

const keyDelivery = (): KeyDeliveryAdapter => ({
  setUp: (passphrase) => createCloudEncryption(passphrase),
  unlock: (passphrase) => unlockCloudEncryption(passphrase),
  recover: (recoveryCode) => recoverCloudEncryption(recoveryCode),
  escrowPresence: {
    subscribe: (next) =>
      cloudEscrowPresence().subscribe((presence) => {
        next(toEscrowPresence(presence));
      }),
  },
});

export const createDexieCloudProvider = (): SyncProvider => ({
  id: DEXIE_CLOUD_PROVIDER_ID,
  frameSync: frameSync(),
  keyDelivery: keyDelivery(),
});

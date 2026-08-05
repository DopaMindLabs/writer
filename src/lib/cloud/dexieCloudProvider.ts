import type { SyncState } from 'dexie-cloud-addon';
import { assertNever } from '@/lib/invariant';
import { db as appDb } from '@/db/db';
import type {
  AccessControlAdapter,
  DurableSyncCapability,
  KeyDeliveryAdapter,
  SyncProvider,
  SyncProviderBinding,
  SyncStatus,
} from 'writer-sync/core';
import { KeyEscrowPresence, SyncPhase } from 'writer-sync/core';
import type { EscrowPresence } from './cloudClient';
import {
  DEXIE_CLOUD_PROVIDER_ID,
  DEXIE_CLOUD_PROVIDER_KIND,
} from './dexieCloudProviderId';
import { createSpaceRealm, dropSpaceRealm, isShared, privateRealmOf } from './spaceRealm';
import {
  addSpaceMember,
  listSpaceMembers,
  removeSpaceMember,
  setSpaceMemberRole,
} from './realmMembers';
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
 * `durableSync` and `keyDelivery` are declared. `accessControl` lands with the
 * realm tables and its first caller; the addon has no realtime transport or
 * peer discovery of its own, so neither is declared at all.
 */
export { DEXIE_CLOUD_PROVIDER_ID, DEXIE_CLOUD_PROVIDER_KIND };

/** Map the addon's phase onto the provider-neutral one. Total by construction. */
const toSyncPhase = (phase: SyncState['phase']): SyncPhase => {
  switch (phase) {
    case 'initial':
      return SyncPhase.Initial;
    case 'not-in-sync':
      return SyncPhase.Pending;
    case 'pushing':
      return SyncPhase.Pushing;
    case 'pulling':
      return SyncPhase.Pulling;
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

const durableSync = (): DurableSyncCapability => ({
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

/**
 * Membership and scope control, delegated to the adapter-owned realm services.
 * Every Dexie-specific concept stays here: `realmId`, member rows and the
 * private-realm rule never reach a caller — a scope maps onto its realm through
 * the returned {@link SyncProviderBinding} only. Role provisioning and
 * cross-user key delivery remain absent (dormant groundwork, not sharing).
 */
const accessControl = (): AccessControlAdapter => ({
  createScope: async (scopeId) => {
    await createSpaceRealm(scopeId);
  },
  dropScope: (scopeId) => dropSpaceRealm(scopeId),
  listMembers: (scopeId) => listSpaceMembers(scopeId),
  addMember: async ({ scopeId, email, role }) => {
    await addSpaceMember({ spaceId: scopeId, email, role });
  },
  removeMember: (scopeId, memberId) => removeSpaceMember(scopeId, memberId),
  setMemberRole: ({ scopeId, memberId, role }) =>
    setSpaceMemberRole({ spaceId: scopeId, memberId, role }),
  resolveBinding: async (scopeId): Promise<SyncProviderBinding | undefined> => {
    // The binding is persisted state, not something re-derived from a content
    // row: since the frame cutover no domain row carries a realm at all.
    const binding = await appDb.syncProviderBindings.get([
      scopeId,
      DEXIE_CLOUD_PROVIDER_ID,
    ]);
    if (!binding) return undefined;
    return isShared(binding.externalScopeId, privateRealmOf(appDb))
      ? binding
      : undefined;
  },
});

export const createDexieCloudProvider = (): SyncProvider => ({
  id: DEXIE_CLOUD_PROVIDER_ID,
  kind: DEXIE_CLOUD_PROVIDER_KIND,
  durableSync: durableSync(),
  keyDelivery: keyDelivery(),
  accessControl: accessControl(),
});

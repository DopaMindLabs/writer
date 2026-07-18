import type { SyncTransport } from '@/lib/collab/types';

/**
 * The public capability vocabulary for Writer Sync.
 *
 * A {@link SyncProvider} is one backend (Dexie Cloud, WebRTC, a LAN transport, a
 * local folder) that offers *some* of the capabilities below. Nothing here knows
 * how any particular backend works: the contracts are shaped after the observable
 * surface the app already speaks, so an adapter maps rather than casts.
 *
 * `replication` stays an internal implementation term; the public vocabulary is
 * provider, capability, and binding.
 */

/** Identifies a provider within one coordinator, e.g. `'dexie-cloud'`. */
export type SyncProviderId = string;

/**
 * Identifies an access-control scope in *application* terms — today a space id.
 * A scope is what a provider maps onto its own boundary (a Dexie Cloud realm),
 * which is why the provider-side id is kept separately on the binding.
 */
export type AccessScopeId = string;

/** A cancellable subscription. */
export interface SyncSubscription {
  unsubscribe: () => void;
}

/**
 * The minimal observable the sync layer depends on. Deliberately structurally
 * identical to `CloudObservable` in `@/lib/cloud/cloudObservable`, so a provider
 * adapter can hand an existing cloud observable straight through without a cast,
 * while this module keeps no dependency on the cloud subsystem.
 */
export interface SyncObservable<T> {
  subscribe: (next: (value: T) => void) => SyncSubscription;
}

/**
 * Provider-neutral sync phase. Backend-specific phases (Dexie Cloud has seven)
 * are mapped onto these four by the adapter, so callers never branch on a
 * vocabulary only one provider uses.
 */
export type SyncPhase = 'initial' | 'syncing' | 'in-sync' | 'error';

export interface SyncStatus {
  phase: SyncPhase;
  error?: Error;
}

/**
 * Durable replication of encrypted frames. `start` boots the provider's session
 * and resolves with the teardown for everything it started.
 */
export interface EncryptedFrameSync {
  start: () => Promise<() => void>;
  /** Ask for a fresh round now. Rejections propagate so the UI can surface them. */
  requestSync: () => Promise<void>;
  status: SyncObservable<SyncStatus>;
  /** Fires after each settled round. Never emits when the provider is inactive. */
  syncComplete: SyncObservable<void>;
}

/**
 * Live peer-to-peer transport. Reuses the collab layer's engine-agnostic
 * contract rather than declaring a second, diverging one — `sharesStore`
 * semantics carry over unchanged.
 */
export type RealtimeSyncTransport = SyncTransport;

export interface DiscoveredPeer {
  id: string;
  label?: string;
  lastSeenAt?: number;
}

/** Finding the other endpoints a realtime transport can reach. */
export interface PeerDiscoveryAdapter {
  register: () => Promise<void>;
  release: () => Promise<void>;
  peers: SyncObservable<DiscoveredPeer[]>;
}

export type ScopeRole = 'owner' | 'editor' | 'viewer';

export interface ScopeMember {
  id: string;
  email: string;
  role: ScopeRole;
}

/**
 * Membership and permissions for an access scope. Providers without a server-side
 * authority (WebRTC, Bluetooth) simply omit this capability.
 */
export interface AccessControlAdapter {
  createScope: (scopeId: AccessScopeId) => Promise<void>;
  dropScope: (scopeId: AccessScopeId) => Promise<void>;
  listMembers: (scopeId: AccessScopeId) => Promise<ScopeMember[]>;
  addMember: (options: {
    scopeId: AccessScopeId;
    email: string;
    role: ScopeRole;
  }) => Promise<void>;
  removeMember: (scopeId: AccessScopeId, memberId: string) => Promise<void>;
  setMemberRole: (options: {
    scopeId: AccessScopeId;
    memberId: string;
    role: ScopeRole;
  }) => Promise<void>;
  resolveBinding: (scopeId: AccessScopeId) => Promise<SyncProviderBinding | undefined>;
}

/**
 * Whether the account holds key material this device can adopt: `'unknown'`
 * until the provider can answer, then `'present'` or `'none'`.
 */
export type KeyEscrowPresence = 'unknown' | 'none' | 'present';

/**
 * Getting the content key onto a device. Shaped after the existing escrow flow:
 * setup returns the recovery code, unlock and recover resolve on success and
 * throw a typed error otherwise.
 */
export interface KeyDeliveryAdapter {
  setUp: (passphrase: string) => Promise<string>;
  unlock: (passphrase: string) => Promise<void>;
  recover: (recoveryCode: string) => Promise<void>;
  escrowPresence: SyncObservable<KeyEscrowPresence>;
}

export interface SyncProvider {
  id: SyncProviderId;
  frameSync?: EncryptedFrameSync;
  realtime?: RealtimeSyncTransport;
  discovery?: PeerDiscoveryAdapter;
  accessControl?: AccessControlAdapter;
  keyDelivery?: KeyDeliveryAdapter;
}

/** Which provider backs a given scope, and under what id on that provider. */
export interface SyncProviderBinding {
  scopeId: AccessScopeId;
  providerId: SyncProviderId;
  /** The provider's own id for the scope — a Dexie Cloud realm id, say. */
  externalScopeId?: string;
  enabled: boolean;
}

export interface WriterSyncOptions {
  providers: SyncProvider[];
}

export type SyncCapability =
  | 'frameSync'
  | 'realtime'
  | 'discovery'
  | 'accessControl'
  | 'keyDelivery';

/**
 * Narrowing guard: `hasCapability(p, 'accessControl')` proves `p.accessControl`
 * is defined, so callers need no second check.
 */
export const hasCapability = <C extends SyncCapability>(
  provider: SyncProvider,
  capability: C,
): provider is SyncProvider & Required<Pick<SyncProvider, C>> =>
  provider[capability] !== undefined;

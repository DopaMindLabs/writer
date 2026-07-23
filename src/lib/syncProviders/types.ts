import type { SyncTransport } from '@/lib/collab/types';

/**
 * The public capability vocabulary for Writer Sync.
 *
 * A {@link SyncProvider} is one *configured instance* of a backend (Dexie Cloud,
 * a WebRTC peer, a LAN transport, a local folder) that offers *some* of the
 * capabilities below. Nothing here knows how any particular backend works: the
 * contracts are shaped after the observable surface the app already speaks, so an
 * adapter maps rather than casts.
 *
 * The engine picks no provider by default and reads no meaning into registration
 * order — defaults live in {@link SyncConfiguration}, never on a provider.
 * `replication` stays an internal implementation term; the public vocabulary is
 * provider, capability, binding and scope.
 */

/**
 * Identifies a *kind* of backend, e.g. `'dexie-cloud'` or `'webrtc'`. Several
 * configured instances may share one kind (two peers, two folders), so a kind
 * never identifies a single instance — {@link SyncProviderInstanceId} does.
 */
export type SyncProviderKind = string;

/**
 * Identifies one *configured provider instance* within a coordinator. Unique per
 * instance, so two instances of the same {@link SyncProviderKind} are both legal
 * and distinguishable.
 */
export type SyncProviderInstanceId = string;

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
 * Provider-neutral sync phase. A backend's own vocabulary is mapped onto these
 * by its adapter, so callers never branch on terms only one provider uses.
 */
export enum SyncPhase {
  /** Nothing has run yet. */
  Initial = 'initial',
  /** Work is outstanding, but no round is in flight. */
  Pending = 'pending',
  /** Sending local changes. */
  Pushing = 'pushing',
  /** Receiving remote changes. */
  Pulling = 'pulling',
  /** Settled, nothing outstanding. */
  InSync = 'in-sync',
  /** The backend is unreachable. */
  Offline = 'offline',
  /** The last round failed; see {@link SyncStatus.error}. */
  Error = 'error',
}

export interface SyncStatus {
  phase: SyncPhase;
  error?: Error;
}

/**
 * Durable, session-level replication of encrypted frames. `start` boots the
 * provider's session and resolves with the teardown for everything it started.
 *
 * This is the provider *lifecycle* port. The common encrypted-frame exchange it
 * carries arrives with the operation protocol (runbook slice 1E), and Dexie
 * Cloud is made to implement it in slice 1F; until then a provider's `start`
 * drives its own existing replication.
 */
export interface DurableSyncCapability {
  start: () => Promise<() => void>;
  /** Ask for a fresh round now. Rejections propagate so the UI can surface them. */
  requestSync: () => Promise<void>;
  status: SyncObservable<SyncStatus>;
  /** Fires after each settled round. Never emits when the provider is inactive. */
  syncComplete: SyncObservable<void>;
}

/** Options a realtime transport is created for: one scope, one logical channel. */
export interface RealtimeTransportOptions {
  accessScopeId: AccessScopeId;
  channelId: string;
}

/**
 * Live peer-to-peer transport, created per scope + channel rather than shared
 * across the whole provider. A provider offers the *capability* to make a
 * transport; the transport itself reuses the collab layer's engine-agnostic
 * {@link SyncTransport} contract, so `sharesStore` semantics carry over
 * unchanged. Per-document / per-scope creation is deliberately kept out of
 * session boot.
 */
export interface RealtimeSyncCapability {
  createTransport: (options: RealtimeTransportOptions) => Promise<SyncTransport>;
}

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

export enum ScopeRole {
  Owner = 'owner',
  Editor = 'editor',
  Viewer = 'viewer',
}

export interface ScopeMember {
  id: string;
  email: string;
  role: ScopeRole;
}

/**
 * Membership and permissions for an access scope. Providers without a server-side
 * authority (WebRTC, Bluetooth) simply omit this capability.
 *
 * `resolveBinding` answers the *provider-side* binding for a scope (a Dexie Cloud
 * realm, say) — how a provider maps {@link AccessScopeId} onto its own boundary.
 * The coordinator's own binding resolution reads configured
 * {@link SyncProviderBinding}s and never depends on registration order.
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

/** Whether the account holds key material this device can adopt. */
export enum KeyEscrowPresence {
  /** The provider cannot answer yet — never offer set-up on this. */
  Unknown = 'unknown',
  /** The account holds no key material: offer set-up. */
  None = 'none',
  /** The account holds key material: offer unlock or adopt. */
  Present = 'present',
}

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

/**
 * One configured provider instance. `id` identifies the instance; `kind` names
 * the backend, so two instances of one kind are both legal. A provider declares
 * only the capabilities it can honour and carries no default or priority of its
 * own — those belong to {@link SyncConfiguration}.
 */
export interface SyncProvider {
  id: SyncProviderInstanceId;
  kind: SyncProviderKind;
  durableSync?: DurableSyncCapability;
  realtime?: RealtimeSyncCapability;
  discovery?: PeerDiscoveryAdapter;
  accessControl?: AccessControlAdapter;
  keyDelivery?: KeyDeliveryAdapter;
}

/** Which provider instance backs a given scope, and under what id on it. */
export interface SyncProviderBinding {
  scopeId: AccessScopeId;
  providerInstanceId: SyncProviderInstanceId;
  /** The provider's own id for the scope — a Dexie Cloud realm id, say. */
  externalScopeId?: string;
  enabled: boolean;
}

/** Identifies a configured trust-bootstrap method such as QR. */
export type PairingMethodId = string;

/**
 * An interchangeable trust-bootstrap method (QR is the Stage 2A implementation).
 * Stage 1 carries the configuration seam only; the pairing state machine lands in
 * Stage 2A. `kind` names the mechanism so an application can pick one without the
 * engine privileging any.
 */
export interface PairingMethod {
  id: PairingMethodId;
  kind: string;
}

/**
 * The complete, provider-neutral sync configuration an application supplies — the
 * single place defaults live. The engine selects no provider, pairing method or
 * ordering on its own. Zero, one or several providers and bindings are all valid;
 * `bindings` and `pairingMethods` default to empty when omitted.
 */
export interface SyncConfiguration {
  providers: SyncProvider[];
  bindings?: SyncProviderBinding[];
  /** The application's default provider instance, if it names one. */
  defaultProviderInstanceId?: SyncProviderInstanceId;
  pairingMethods?: PairingMethod[];
  /** The application's default pairing method, if it names one. */
  defaultPairingMethodId?: PairingMethodId;
}

/**
 * What {@link createSyncCoordinator} accepts — the application's
 * {@link SyncConfiguration}. Kept as a named alias because the coordinator input
 * and the application configuration are one and the same object.
 */
export type WriterSyncOptions = SyncConfiguration;

export type SyncCapability =
  | 'durableSync'
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

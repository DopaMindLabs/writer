/**
 * The engine's neutral core: what a sync provider is, how one is selected, the
 * identities a replicated mutation carries, and the logical clock that orders
 * them. Nothing here knows about a database, a framework or a transport.
 *
 * Only the symbols re-exported below are public. Files inside this directory
 * may import each other directly; consumers may not.
 */

export {
  SyncPhase,
  ScopeRole,
  KeyEscrowPresence,
  hasCapability,
} from './providers.types';
export type {
  AccessControlAdapter,
  AccessScopeId,
  DiscoveredPeer,
  DurableSyncCapability,
  KeyDeliveryAdapter,
  PairingMethod,
  PairingMethodId,
  PeerDiscoveryAdapter,
  RealtimeSyncCapability,
  RealtimeTransportOptions,
  ScopeMember,
  SyncCapability,
  SyncConfiguration,
  SyncObservable,
  SyncProvider,
  SyncProviderBinding,
  SyncProviderInstanceId,
  SyncProviderKind,
  SyncStatus,
  SyncSubscription,
} from './providers.types';

export { createSyncCoordinator } from './coordinator';
export type { SyncCoordinator } from './coordinator';

export {
  defaultProvider,
  enabledBindingsForScope,
  validateSyncConfiguration,
} from './selectionPolicy';

export type { SyncTransport } from './transport.types';

export { asDeviceId, asOperationId, asPrincipalId } from './ids';
export type { DeviceId, OperationId, PrincipalId } from './ids';

export { compareTimestamps, createHybridLogicalClock } from './hybridLogicalClock';
export type { HybridLogicalClock, HybridLogicalTimestamp } from './hybridLogicalClock';

export { createEntityMetadata, updateEntityMetadata } from './entityMetadata';
export type {
  EntityCreationInput,
  EntityUpdateInput,
  ReplicatedEntityMetadata,
} from './entityMetadata';

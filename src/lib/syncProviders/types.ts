import type { SyncTransport } from '@/lib/collab/types';

export type SyncProviderId = string & { readonly __brand: 'SyncProviderId' };
export type AccessScopeId = string & { readonly __brand: 'AccessScopeId' };

export type SyncPhase = 'synced' | 'syncing' | 'error' | 'offline';

export interface SyncState {
  phase: SyncPhase;
  error?: Error;
}

export type EscrowState = 'present' | 'missing' | 'keyless' | 'mismatch';

export interface EscrowPresence {
  state: EscrowState;
  identity?: string;
}

export interface EncryptedFrameSync {
  start: () => Promise<() => void>;
  stop: () => Promise<void>;
  requestSync: (purpose?: 'push' | 'pull') => Promise<void>;
  syncState: () => SyncState;
  onSyncComplete: (fn: () => void) => () => void;
}

export type RealtimeSyncTransport = SyncTransport;

export interface PeerDiscoveryAdapter {
  registerPeer: (id: string, metadata?: Record<string, unknown>) => Promise<void>;
  releasePeer: (id: string) => Promise<void>;
  listPeers: () => Promise<{ id: string; metadata?: Record<string, unknown> }[]>;
}

export type Role = 'owner' | 'editor' | 'viewer';

export interface AccessControlAdapter {
  createScope: (scopeId: AccessScopeId) => Promise<void>;
  dropScope: (scopeId: AccessScopeId) => Promise<void>;
  addMember: (scopeId: AccessScopeId, email: string, role: Role) => Promise<void>;
  removeMember: (scopeId: AccessScopeId, memberId: string) => Promise<void>;
  setMemberRole: (scopeId: AccessScopeId, memberId: string, role: Role) => Promise<void>;
  listMembers: (
    scopeId: AccessScopeId,
  ) => Promise<{ id: string; email: string; role: Role }[]>;
  resolveBinding: (scopeId: AccessScopeId) => Promise<SyncProviderBinding | undefined>;
}

export interface KeyDeliveryAdapter {
  createEncryption: (cfg?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  unlockEncryption: (passphrase: string) => Promise<void>;
  recoverEncryption: (recoveryCode: string) => Promise<void>;
  escrowPresence: () => EscrowPresence;
}

export interface SyncProvider {
  id: SyncProviderId;
  frameSync?: EncryptedFrameSync;
  realtime?: RealtimeSyncTransport;
  discovery?: PeerDiscoveryAdapter;
  accessControl?: AccessControlAdapter;
  keyDelivery?: KeyDeliveryAdapter;
}

export interface SyncProviderBinding {
  scopeId: AccessScopeId;
  providerId: SyncProviderId;
  externalScopeId?: string;
  enabled: boolean;
}

export interface WriterSyncOptions {
  providers: SyncProvider[];
}

type CapabilityName = 'frameSync' | 'realtime' | 'discovery' | 'accessControl' | 'keyDelivery';

export const hasCapability = (provider: SyncProvider, cap: CapabilityName): boolean => {
  return cap in provider && provider[cap] !== undefined;
};

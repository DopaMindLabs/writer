import type { AccessScopeId } from '@/lib/syncProviders/types';
import type { OperationId } from '@/lib/syncProviders/ids';
import type {
  EncryptedSyncFrame,
  SyncInboxEntry,
  SyncTombstone,
} from './operation.types';

/**
 * Framework-neutral persistence ports for the operation protocol. An
 * application supplies implementations over its own storage; providers depend
 * only on these contracts.
 */

/** The append-only journal of immutable encrypted frames — the replicated store. */
export interface OperationStore {
  append: (frame: EncryptedSyncFrame) => Promise<void>;
  byId: (operationId: OperationId) => Promise<EncryptedSyncFrame | undefined>;
  /** Every journalled frame for a scope, in insertion order. */
  forScope: (accessScopeId: AccessScopeId) => Promise<EncryptedSyncFrame[]>;
}

/** The receiver-side record of accepted operations and deletion tombstones. */
export interface OperationInbox {
  /** Whether `operationId` has already been accepted (replay is a no-op). */
  has: (operationId: OperationId) => Promise<boolean>;
  record: (entry: SyncInboxEntry) => Promise<void>;
  tombstoneFor: (
    entityTable: string,
    entityId: string,
  ) => Promise<SyncTombstone | undefined>;
  putTombstone: (tombstone: SyncTombstone) => Promise<void>;
}


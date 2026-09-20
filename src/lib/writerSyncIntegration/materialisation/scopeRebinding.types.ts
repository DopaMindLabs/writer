import type { LoremDB } from '@/db/LoremDB';
import type { SyncAttachmentChunk } from '@/db/schema';
import type { AccessScopeId, OperationId } from 'writer-sync/core';
import type { ScopeKeyResolver } from 'writer-sync/crypto';
import type { EncryptedSyncFrame, SyncInboxEntry, SyncTombstone } from 'writer-sync/operations';
import type { JournalledRow } from './journalledRow';
import type { JournalIdentity } from './operationJournalMiddleware';

/** Local, durable identity of a user-requested move, independent of retained history. */
export interface ScopeRebindingReceipt {
  readonly requestId: string;
  readonly sourceScopeId: AccessScopeId;
  readonly destinationScopeId: AccessScopeId;
  readonly operationIds: OperationId[];
}

export interface ScopeTransition {
  readonly db: LoremDB;
  readonly requestId: string;
  readonly scopes: { readonly from: AccessScopeId; readonly to: AccessScopeId };
}

export interface ScopeRebindingOptions extends ScopeTransition {
  readonly resolver: ScopeKeyResolver;
  readonly identity: () => Promise<JournalIdentity>;
}

/** Also records entities now outside the source scope, or no longer present. */
export interface ScopeEntityState {
  readonly entityTable: string;
  readonly entityId: string;
  readonly row: JournalledRow | undefined;
  readonly tombstone: SyncTombstone | undefined;
}

export interface RebindingSnapshot {
  readonly entities: ScopeEntityState[];
  readonly history: EncryptedSyncFrame[];
  readonly inbox: SyncInboxEntry[];
  readonly receipt: ScopeRebindingReceipt | undefined;
  readonly trust: string;
}

export interface PreparedScopeEntity {
  readonly frame: EncryptedSyncFrame;
  readonly row: JournalledRow | null;
  readonly chunks: SyncAttachmentChunk[];
}

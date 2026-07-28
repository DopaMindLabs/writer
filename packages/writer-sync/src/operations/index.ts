/**
 * The operation protocol: the immutable frame every provider carries, its strict
 * codec, deterministic convergence, and the ports an application implements to
 * store and materialise operations.
 */

export { SYNC_OPERATION_VERSION } from './operation.types';
export type {
  AttachmentChunkManifest,
  EncryptedSyncFrame,
  SyncInboxEntry,
  SyncOperationHeader,
  SyncOperationKind,
  SyncTombstone,
} from './operation.types';

export {
  ChunkIntegrityError,
  MAX_ATTACHMENT_BYTES,
  MAX_CHUNK_BYTES,
  MAX_CHUNK_COUNT,
  MalformedManifestError,
  assembleChunks,
  buildChunkManifest,
  missingChunkIndices,
  validateChunkManifest,
  verifyChunk,
} from './attachmentChunking';

export {
  EMPTY_PAYLOAD_HASH,
  FramePayloadMismatchError,
  MalformedFrameError,
  WrongScopeFrameError,
  decodeFrame,
  hashPayload,
  verifyFrame,
} from './operationCodec';

export { compareOperations, supersedes } from './convergence';

export {
  JOURNAL_RETENTION_DEFAULT_DAYS,
  MILLIS_PER_DAY,
  expiredOperationIds,
  requiresFullExchange,
  retentionCutoff,
} from './journalRetention';
export type { RetentionOptions } from './journalRetention';

export { compactableOperationIds, releasableTombstones } from './journalCompaction';
export type { CompactionOptions, PeerAcknowledgement } from './journalCompaction';

export type { OperationInbox, OperationStore } from './operationStore.types';
export type { MaterializeResult, OperationMaterializer } from './materializer.types';

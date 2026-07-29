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

export { buildScopeManifests, framesForRequest, planCatchUp } from './scopeManifest';
export type { CatchUpRequest, OriginSummary, ScopeManifest } from './scopeManifest';

export {
  CATCH_UP_PROTOCOL_VERSION,
  MAX_ACKNOWLEDGEMENTS,
  MAX_ATTACHMENT_OFFERS,
  MAX_FRAMES_PER_MESSAGE,
  MAX_MANIFESTS,
  MAX_ORIGINS_PER_SCOPE,
  MAX_REQUESTED_CHUNKS,
  MAX_REQUESTS,
  MalformedCatchUpMessageError,
  decodeCatchUpMessage,
  encodeCatchUpMessage,
} from './catchUpMessage';
export type {
  AttachmentChunkPayload,
  CatchUpMessage,
  OperationAcknowledgement,
} from './catchUpMessage';

export { createCatchUpExchange, UndeliverableFrameError } from './catchUpExchange';
export type { CatchUpExchange, CatchUpPorts } from './catchUpExchange';

export { startCatchUpSession } from './catchUpSession';
export type { CatchUpSession } from './catchUpSession';
export { fitsMessageBudget, packFrames } from './catchUpBatching';
export type { PackedFrames } from './catchUpBatching';

export {
  MAX_INFLIGHT_ATTACHMENTS,
  TRANSFER_CHUNK_BYTES,
  createAttachmentTransfer,
} from './attachmentTransfer';
export type { AttachmentTransfer, AttachmentTransferPorts } from './attachmentTransfer';

export type { OperationInbox, OperationStore } from './operationStore.types';
export type { MaterializeResult, OperationMaterializer } from './materializer.types';

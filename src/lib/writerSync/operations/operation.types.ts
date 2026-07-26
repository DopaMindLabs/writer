import type { AccessScopeId } from '@/lib/syncProviders/types';
import type { DeviceId, OperationId } from '@/lib/syncProviders/ids';
import type { HybridLogicalTimestamp } from '@/lib/writerSync/hybridLogicalClock';

/**
 * The provider-neutral operation protocol: one logical mutation, encrypted
 * once, carried verbatim by every enabled provider. A receiver records the
 * operation id before materialising, so the same operation arriving through
 * two providers can never apply twice.
 *
 * **Disclosure boundary.** A provider sees only the routing header — protocol
 * version, operation id, scope, entity table/id, kind, device id, logical time,
 * key id/epoch and the payload hash — plus opaque ciphertext. The payload
 * (the entity's content fields) and the acting principal are encrypted.
 */

export const SYNC_OPERATION_VERSION = 1;

/** What a logical mutation does to its entity. */
export type SyncOperationKind = 'put' | 'delete';

/**
 * The plaintext routing header of one operation — everything a provider may
 * read. `payloadHash` (SHA-256, base64) authenticates the ciphertext so a
 * provider or peer can verify integrity before the receiver decrypts.
 */
export interface SyncOperationHeader {
  v: typeof SYNC_OPERATION_VERSION;
  operationId: OperationId;
  accessScopeId: AccessScopeId;
  /** The entity's table in the authoritative table policy. */
  entityTable: string;
  entityId: string;
  kind: SyncOperationKind;
  deviceId: DeviceId;
  logicalAt: HybridLogicalTimestamp;
  /** Names the key that sealed the payload. */
  keyId: string;
  epoch: number;
  /** SHA-256 of the encrypted payload, base64. */
  payloadHash: string;
}

/**
 * A complete operation as stored and transported: the routing header plus the
 * opaque, already-encrypted payload (base64). The payload of a `put` is the
 * sealed entity content — which includes the acting principal's attribution;
 * a `delete` carries an empty payload. `signature` is the device signature
 * seam: Stage 1 stores it empty, Stage 2A signs with the cryptographic device
 * identity. The frame is immutable once written — providers never re-encrypt
 * or reinterpret it.
 */
export interface EncryptedSyncFrame extends SyncOperationHeader {
  payload: string;
  signature: string;
}

/** An accepted operation recorded in the receiver's inbox. */
export interface SyncInboxEntry {
  operationId: OperationId;
  accessScopeId: AccessScopeId;
  entityTable: string;
  entityId: string;
  /** What materialisation did with the operation. */
  result: 'applied' | 'superseded' | 'tombstoned';
  receivedAt: number;
}

/**
 * A deletion that must not be forgotten until every relevant device has
 * acknowledged it: without the tombstone, a stale `put` replicated later would
 * silently resurrect the entity.
 */
export interface SyncTombstone {
  entityId: string;
  entityTable: string;
  accessScopeId: AccessScopeId;
  operationId: OperationId;
  deviceId: DeviceId;
  logicalAt: HybridLogicalTimestamp;
  /** Device ids that have acknowledged the deletion. */
  acknowledgedBy: string[];
}

/**
 * The chunk manifest an attachment payload carries instead of one unbounded
 * blob: transfer happens chunk by chunk, resumable by asking for the missing
 * indices, each chunk verifiable on its own.
 */
export interface AttachmentChunkManifest {
  attachmentId: string;
  /** SHA-256 of the complete content, base64. */
  contentHash: string;
  totalBytes: number;
  chunkBytes: number;
  chunkCount: number;
  /** SHA-256 per chunk, base64, indexed by chunk position. */
  chunkHashes: string[];
}

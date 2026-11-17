import type { LoremDB } from '@/db/LoremDB';
import { invariant } from '@/lib/invariant';
import { chunkedBlobFieldFor } from '@/lib/writerSyncIntegration/writerTablePolicy';
import {
  fromBase64,
  openAttachmentContent,
  type SyncKeyRing,
} from 'writer-sync/crypto';
import {
  assembleChunks,
  MAX_CHUNK_COUNT,
  missingChunkIndices,
  validateChunkManifest,
  type AttachmentChunkManifest,
  type EncryptedSyncFrame,
} from 'writer-sync/operations';

/** The frame is valid, but its separately carried ciphertext is not all local yet. */
export class AttachmentChunksPendingError extends Error {
  constructor(attachmentId: string, missing: readonly number[]) {
    super(
      `Attachment ${attachmentId} is waiting for ${String(missing.length)} chunk(s)`,
    );
    this.name = 'AttachmentChunksPendingError';
  }
}

const recordOf = (value: unknown): Record<string, unknown> => {
  invariant(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    'attachment blobRef must be an object',
  );
  return value as Record<string, unknown>;
};

const textField = (row: Record<string, unknown>, field: string): string => {
  const value = row[field];
  invariant(
    typeof value === 'string' && value.length > 0,
    () => `attachment blobRef.${field} must be non-empty text`,
  );
  return value;
};

const countField = (row: Record<string, unknown>, field: string): number => {
  const value = row[field];
  invariant(
    typeof value === 'number' && Number.isInteger(value) && value > 0,
    () => `attachment blobRef.${field} must be a positive integer`,
  );
  return value;
};

const manifestOf = (value: unknown): AttachmentChunkManifest => {
  const row = recordOf(value);
  const hashes = row.chunkHashes;
  invariant(
    Array.isArray(hashes) && hashes.length <= MAX_CHUNK_COUNT,
    'attachment blobRef.chunkHashes must be a bounded list',
  );
  const chunkHashes = hashes.map((hash: unknown) => {
    invariant(
      typeof hash === 'string' && hash.length > 0,
      'attachment blobRef.chunkHashes must contain non-empty text',
    );
    return hash;
  });
  const manifest: AttachmentChunkManifest = {
    attachmentId: textField(row, 'attachmentId'),
    contentHash: textField(row, 'contentHash'),
    totalBytes: countField(row, 'totalBytes'),
    chunkBytes: countField(row, 'chunkBytes'),
    chunkCount: countField(row, 'chunkCount'),
    chunkHashes,
  };
  validateChunkManifest(manifest);
  return manifest;
};

const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

const chunkMap = async (options: {
  db: LoremDB;
  frame: EncryptedSyncFrame;
  manifest: AttachmentChunkManifest;
}): Promise<Map<number, Uint8Array>> => {
  const rows = await options.db.syncAttachmentChunks
    .where('attachmentId')
    .equals(options.manifest.attachmentId)
    .toArray();
  return new Map(
    rows.map((row) => {
      invariant(
        row.accessScopeId === options.frame.accessScopeId,
        'attachment chunk belongs to a different access scope',
      );
      return [row.index, fromBase64(row.bytes)];
    }),
  );
};

/**
 * Restore a thin attachment payload to Writer's required domain row.
 *
 * The authenticated frame is journalled before chunk lookup so an incomplete
 * transfer remains retryable by the ordinary ingestion sweep. The inbox is
 * deliberately untouched until the complete ciphertext verifies and opens.
 */
export const materializeAttachmentFrame = async (options: {
  db: LoremDB;
  frame: EncryptedSyncFrame;
  ring: SyncKeyRing;
  row: Record<string, unknown>;
}): Promise<Record<string, unknown>> => {
  const { db, frame, ring, row } = options;
  const blobField = chunkedBlobFieldFor(frame.entityTable);
  if (blobField === undefined) return row;
  const manifest = manifestOf(row.blobRef);
  invariant(
    manifest.attachmentId === frame.entityId && row.id === frame.entityId,
    'attachment manifest does not name the framed row',
  );
  await db.syncOperations.put(frame);
  const chunks = await chunkMap({ db, frame, manifest });
  const missing = missingChunkIndices({
    manifest,
    have: new Set(chunks.keys()),
  });
  if (missing.length > 0) {
    throw new AttachmentChunksPendingError(manifest.attachmentId, missing);
  }
  const sealed = await assembleChunks({ manifest, chunks });
  const content = await openAttachmentContent({
    ring,
    binding: {
      accessScopeId: frame.accessScopeId,
      entityTable: frame.entityTable,
      entityId: frame.entityId,
      keyId: frame.keyId,
      epoch: frame.epoch,
    },
    sealed,
  });
  const mime = row.mime;
  invariant(typeof mime === 'string', 'attachment mime must be text');
  const withoutRef = Object.fromEntries(
    Object.entries(row).filter(([field]) => field !== 'blobRef'),
  );
  return {
    ...withoutRef,
    [blobField]: new Blob([asBuffer(content)], { type: mime }),
  };
};

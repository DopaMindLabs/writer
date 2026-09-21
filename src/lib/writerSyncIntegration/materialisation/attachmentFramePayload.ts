import type { SyncAttachmentChunk } from '@/db/schema';
import { invariant } from '@/lib/invariant';
import { keyIdOf } from '@/lib/cloud/crypto/envelope';
import { chunkedBlobFieldFor } from '@/lib/writerSyncIntegration/writerTablePolicy';
import {
  sealAttachmentContent,
  toBase64,
  type SyncKeyRing,
} from 'writer-sync/crypto';
import {
  buildChunkManifest,
  TRANSFER_CHUNK_BYTES,
} from 'writer-sync/operations';
import type { AttachmentChunkManifest } from 'writer-sync/operations';
import { isJournalledRow, type JournalledRow } from './journalledRow';

/**
 * The row payload an operation frame seals, plus the separately persisted
 * ciphertext pieces the payload's manifest names.
 */
export interface PreparedFramePayload {
  row: JournalledRow;
  chunks: SyncAttachmentChunk[];
}

const chunkRows = (options: {
  accessScopeId: string;
  attachmentId: string;
  content: Uint8Array;
  manifest: AttachmentChunkManifest;
}): SyncAttachmentChunk[] =>
  Array.from({ length: options.manifest.chunkCount }, (_unused, index) => ({
    attachmentId: options.attachmentId,
    index,
    accessScopeId: options.accessScopeId,
    bytes: toBase64(
      options.content.subarray(
        index * options.manifest.chunkBytes,
        (index + 1) * options.manifest.chunkBytes,
      ),
    ),
  }));

/**
 * Replace a configured binary field with a manifest over ciphertext.
 *
 * Tables without a chunked field pass through untouched. The returned chunks
 * are already encrypted and safe for any provider to carry verbatim.
 */
export const prepareFramePayload = async (options: {
  entityTable: string;
  row: JournalledRow;
  ring: SyncKeyRing;
}): Promise<PreparedFramePayload> => {
  const { entityTable, row, ring } = options;
  const blobField = chunkedBlobFieldFor(entityTable);
  if (blobField === undefined) return { row, chunks: [] };
  const blob = row[blobField];
  invariant(
    blob instanceof Blob,
    () => `${entityTable}.${blobField} must be a Blob before framing`,
  );
  const sealed = await sealAttachmentContent({
    ring,
    binding: {
      accessScopeId: row.accessScopeId,
      entityTable,
      entityId: row.id,
      keyId: keyIdOf(ring),
      epoch: ring.epoch,
    },
    content: new Uint8Array(await blob.arrayBuffer()),
  });
  const manifest = await buildChunkManifest({
    attachmentId: row.id,
    content: sealed,
    chunkBytes: TRANSFER_CHUNK_BYTES,
  });
  const withoutBlob = Object.fromEntries(
    Object.entries(row).filter(([field]) => field !== blobField),
  );
  const framedRow = { ...withoutBlob, blobRef: manifest };
  invariant(
    isJournalledRow(framedRow),
    () => `${entityTable} lost replication metadata while framing its blob`,
  );
  return {
    row: framedRow,
    chunks: chunkRows({
      accessScopeId: row.accessScopeId,
      attachmentId: row.id,
      content: sealed,
      manifest,
    }),
  };
};

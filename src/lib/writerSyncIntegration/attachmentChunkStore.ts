import type { LoremDB } from '@/db/LoremDB';
import type { SyncAttachmentChunk } from '@/db/schema';
import { appLogger } from '@/lib/appLogger';
import { invariant } from '@/lib/invariant';
import { fromBase64, toBase64 } from 'writer-sync/crypto';
import {
  buildChunkManifest,
  createAttachmentTransfer,
  TRANSFER_CHUNK_BYTES,
  type CatchUpAttachments,
} from 'writer-sync/operations';
import { sweepUnappliedFrames } from './materialization/frameIngestion';

const scopeForAttachment = async (
  db: LoremDB,
  attachmentId: string,
): Promise<string> => {
  const frame = await db.syncOperations
    .where('[entityTable+entityId]')
    .equals(['noteAttachments', attachmentId])
    .last();
  invariant(frame, () => `attachment ${attachmentId} has no operation frame`);
  return frame.accessScopeId;
};

const groupsOf = (
  rows: readonly SyncAttachmentChunk[],
): Map<string, SyncAttachmentChunk[]> => {
  const groups = new Map<string, SyncAttachmentChunk[]>();
  for (const row of rows) {
    const held = groups.get(row.attachmentId) ?? [];
    held.push(row);
    groups.set(row.attachmentId, held);
  }
  return groups;
};

const contentOf = (rows: readonly SyncAttachmentChunk[]): Uint8Array => {
  const ordered = [...rows].sort((left, right) => left.index - right.index);
  ordered.forEach((row, index) => {
    invariant(row.index === index, 'attachment chunks are not contiguous');
  });
  const chunks = ordered.map((row) => fromBase64(row.bytes));
  const content = new Uint8Array(
    chunks.reduce((total, chunk) => total + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    content.set(chunk, offset);
    offset += chunk.length;
  }
  return content;
};

const manifestsForScopes = async (
  db: LoremDB,
  accessScopeIds: readonly string[],
) => {
  if (accessScopeIds.length === 0) return [];
  const rows = await db.syncAttachmentChunks
    .where('accessScopeId')
    .anyOf([...accessScopeIds])
    .toArray();
  const groups = groupsOf(rows);
  const attachmentIds = [...groups.keys()];
  const attachments = await db.noteAttachments.bulkGet(attachmentIds);
  return Promise.all(
    attachmentIds.flatMap((attachmentId, index) => {
      if (attachments[index] === undefined) return [];
      const chunks = groups.get(attachmentId);
      invariant(chunks, 'attachment chunk group disappeared');
      return [
        buildChunkManifest({
          attachmentId,
          content: contentOf(chunks),
          chunkBytes: TRANSFER_CHUNK_BYTES,
        }),
      ];
    }),
  );
};

/**
 * Writer's durable implementation of the provider-neutral attachment ports.
 *
 * Chunk rows are shared by cloud and peer providers. A completed transfer
 * merely wakes the ordinary frame sweep; that one inbox-guarded path remains
 * responsible for opening the ciphertext and creating the domain Blob.
 */
export const createAttachmentChunkStore = (db: LoremDB): CatchUpAttachments => ({
  manifestsForScopes: (accessScopeIds) =>
    manifestsForScopes(db, accessScopeIds),
  create: (sends) =>
    createAttachmentTransfer({
      ...sends,
      heldChunkIndices: async (attachmentId) => {
        const rows = await db.syncAttachmentChunks
          .where('attachmentId')
          .equals(attachmentId)
          .toArray();
        return new Set(rows.map((row) => row.index));
      },
      readChunk: async ({ attachmentId, index }) => {
        const row = await db.syncAttachmentChunks.get([attachmentId, index]);
        return row === undefined ? undefined : fromBase64(row.bytes);
      },
      saveChunk: async ({ attachmentId, index, bytes }) => {
        await db.syncAttachmentChunks.put({
          attachmentId,
          index,
          accessScopeId: await scopeForAttachment(db, attachmentId),
          bytes: toBase64(bytes),
        });
      },
      saveAttachment: async () => {
        await sweepUnappliedFrames(db);
      },
      onRejected: (attachmentId, reason) => {
        appLogger.warn('refused an attachment from a peer', {
          attachmentId,
          reason,
        });
      },
    }),
});

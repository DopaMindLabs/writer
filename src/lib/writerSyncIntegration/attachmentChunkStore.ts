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
  const manifests = await Promise.all(
    attachmentIds.map(async (attachmentId, index) => {
      if (attachments[index] === undefined) return null;
      const chunks = groups.get(attachmentId);
      invariant(chunks, 'attachment chunk group disappeared');
      // Skipped by name rather than thrown: one partial or poisoned attachment
      // must not block the whole catalogue.
      try {
        return await buildChunkManifest({
          attachmentId,
          content: contentOf(chunks),
          chunkBytes: TRANSFER_CHUNK_BYTES,
        });
      } catch (error) {
        appLogger.warn('attachment skipped from the offer catalogue', {
          attachmentId,
          error,
        });
        return null;
      }
    }),
  );
  return manifests.filter((manifest) => manifest !== null);
};

/**
 * The manifest for one attachment, or `null` when this device cannot serve it
 * — no chunks held, or the domain row is gone. A partial or poisoned chunk set
 * throws, and the caller decides what one bad attachment costs: a live offer
 * names it and moves on rather than letting it block a whole scope.
 */
export const manifestForAttachment = async (
  db: LoremDB,
  attachmentId: string,
) => {
  const rows = await db.syncAttachmentChunks
    .where('attachmentId')
    .equals(attachmentId)
    .toArray();
  if (rows.length === 0) return null;
  if ((await db.noteAttachments.get(attachmentId)) === undefined) return null;
  return buildChunkManifest({
    attachmentId,
    content: contentOf(rows),
    chunkBytes: TRANSFER_CHUNK_BYTES,
  });
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

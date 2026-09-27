import type { LoremDB } from '@/db/LoremDB';
import type { SyncAttachmentChunk } from '@/db/schema';
import { appLogger } from '@/lib/appLogger';
import { invariant } from '@/lib/invariant';
import { fromBase64, toBase64 } from 'writer-sync/crypto';
import {
  buildChunkManifest,
  compareOperations,
  createAttachmentTransfer,
  TRANSFER_CHUNK_BYTES,
  type CatchUpAttachments,
  type EncryptedSyncFrame,
} from 'writer-sync/operations';
import { admittedFrame } from './materialisation/frameAdmission';
import { sweepUnappliedFrames } from './materialisation/frameIngestion';
import { createWriterFrameVerifier } from './materialisation/writerFrameVerifier';

/**
 * The attachment's latest admitted operation, in convergence order. Chunk rows
 * hold one ciphertext per attachment, and it is this operation's: a scope move
 * reseals the bytes under the destination while the source frame stays
 * journalled, and journal key order says nothing about which of the two came
 * last. Only a frame materialisation would admit counts — one a provider merely
 * wrote must not decide which chunks are kept or how they are labelled.
 */
const latestFrameFor = async (
  db: LoremDB,
  attachmentId: string,
): Promise<EncryptedSyncFrame | undefined> => {
  const candidates = await db.syncOperations
    .where('[entityTable+entityId]')
    .equals(['noteAttachments', attachmentId])
    .toArray();
  const verifySignature = createWriterFrameVerifier(db);
  const admitted: EncryptedSyncFrame[] = [];
  for (const candidate of candidates) {
    const frame = await admittedFrame({ db, candidate, verifySignature });
    if (frame) admitted.push(frame);
  }
  return admitted.sort(compareOperations).at(-1);
};

/**
 * The chunk indices held for the attachment's latest operation. Rows sealed for
 * another scope are an earlier operation's ciphertext — a moved attachment's
 * source — so they are fetched again rather than counted as held.
 */
const heldChunkIndices = async (
  db: LoremDB,
  attachmentId: string,
  latest: EncryptedSyncFrame | undefined,
): Promise<ReadonlySet<number>> => {
  const rows = await db.syncAttachmentChunks
    .where('attachmentId')
    .equals(attachmentId)
    .toArray();
  const current =
    latest === undefined
      ? rows
      : rows.filter((row) => row.accessScopeId === latest.accessScopeId);
  return new Set(current.map((row) => row.index));
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
 * The manifest for one attachment on a link carrying `accessScopeId`, or `null`
 * when this device cannot serve it there — no chunks held, the domain row gone,
 * or either one belonging to another scope. A moved attachment's ciphertext is
 * sealed for its destination, and a link offers only what its scope carries, as
 * catch-up does. A partial or poisoned chunk set throws, and the caller decides
 * what one bad attachment costs: a live offer names it and moves on rather than
 * letting it block a whole scope.
 */
export const manifestForAttachment = async (options: {
  db: LoremDB;
  attachmentId: string;
  accessScopeId: string;
}) => {
  const { db, attachmentId, accessScopeId } = options;
  const rows = await db.syncAttachmentChunks
    .where('attachmentId')
    .equals(attachmentId)
    .toArray();
  if (rows.length === 0) return null;
  if (rows.some((row) => row.accessScopeId !== accessScopeId)) return null;
  const attachment = await db.noteAttachments.get(attachmentId);
  if (attachment?.accessScopeId !== accessScopeId) return null;
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
  create: (sends) => {
    // Each offer binds its attachment to the latest admitted operation once,
    // and every chunk that transfer saves is labelled from that binding: an
    // attachment runs to thousands of chunks, and reading and verifying its
    // history again for each one would let one valid offer stall the session.
    // An operation journalled mid-transfer is picked up by the next offer,
    // which binds afresh and fetches again whatever the superseded one labelled.
    // A binding lasts until its offer settles, whatever became of it: one
    // already held starts no transfer, and a long-lived link offers many.
    const bound = new Map<string, Promise<EncryptedSyncFrame | undefined>>();
    const bind = (attachmentId: string) => {
      const latest = latestFrameFor(db, attachmentId);
      bound.set(attachmentId, latest);
      return latest;
    };
    return createAttachmentTransfer({
      ...sends,
      heldChunkIndices: async (attachmentId) =>
        heldChunkIndices(db, attachmentId, await bind(attachmentId)),
      readChunk: async ({ attachmentId, index }) => {
        const row = await db.syncAttachmentChunks.get([attachmentId, index]);
        return row === undefined ? undefined : fromBase64(row.bytes);
      },
      saveChunk: async ({ attachmentId, index, bytes }) => {
        const latest = await (bound.get(attachmentId) ?? bind(attachmentId));
        invariant(latest, () => `attachment ${attachmentId} has no operation frame`);
        await db.syncAttachmentChunks.put({
          attachmentId,
          index,
          accessScopeId: latest.accessScopeId,
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
      onSettled: (attachmentId) => {
        bound.delete(attachmentId);
      },
    });
  },
});

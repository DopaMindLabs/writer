import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { invariant } from '@/lib/invariant';
import type { MediaItem } from '@/db/schema';
import { PDF_MIME, MAX_PDF_BYTES, isPdfMime } from '@/data/media';
import { sniffPdfMagic, countPdfPages } from '@/lib/pdf/pdfBytes';

/**
 * Why a PDF was rejected. Reason codes only — user-facing copy lives in i18n so
 * the facade stays presentation-free.
 */
export type PdfValidationResult =
  | { ok: true }
  | { ok: false; reason: 'mime' | 'size' | 'not-pdf' | 'corrupt' };

export const validatePdfFile = async (
  file: File,
): Promise<PdfValidationResult> => {
  if (!isPdfMime(file.type)) return { ok: false, reason: 'mime' };
  if (file.size > MAX_PDF_BYTES) return { ok: false, reason: 'size' };
  const blob = new Blob([await file.arrayBuffer()], { type: PDF_MIME });
  if (!(await sniffPdfMagic(blob))) return { ok: false, reason: 'not-pdf' };
  try {
    await countPdfPages(blob);
  } catch {
    // A parse failure is the signal we want: report it as a corrupt file rather
    // than propagating the pdfjs error to the caller.
    return { ok: false, reason: 'corrupt' };
  }
  return { ok: true };
};

export const addMediaItem = async (input: {
  spaceId: string;
  name: string;
  blob: Blob;
}): Promise<MediaItem> => {
  invariant(input.spaceId.length > 0, 'addMediaItem: spaceId required');
  invariant(input.name.length > 0, 'addMediaItem: name required');
  const pageCount = await countPdfPages(input.blob);
  const now = Date.now();
  const item: MediaItem = {
    id: newId(),
    spaceId: input.spaceId,
    name: input.name,
    mime: PDF_MIME,
    size: input.blob.size,
    pageCount,
    blob: input.blob,
    createdAt: now,
    updatedAt: now,
  };
  await db.media.add(item);
  return item;
};

export const getMediaItem = async (
  id: string,
): Promise<MediaItem | undefined> => db.media.get(id);

/**
 * Stamps the item as opened now, so the library's "unread" filter clears it. A
 * no-op-safe update: a missing id simply matches nothing. Keeps `updatedAt` out
 * of it — opening is not an edit and must not reorder the list.
 */
export const markMediaOpened = async (id: string): Promise<void> => {
  invariant(id.length > 0, 'markMediaOpened: id required');
  await db.media.update(id, { openedAt: Date.now() });
};

export const listMediaBySpace = async (
  spaceId: string,
): Promise<MediaItem[]> => {
  // Read through `toArray` (not the cursor-based `sortBy`) and order in memory,
  // per the encryption middleware's cursor-bypass contract.
  const items = await db.media.where('spaceId').equals(spaceId).toArray();
  items.sort((a, b) => a.createdAt - b.createdAt);
  return items.reverse();
};

/**
 * Deletes a media item, its highlights, and detaches any notes that reference
 * it (clearing `mediaId` so they render a "source removed" state) — a note's
 * text is the user's, so it is never cascade-deleted with its source.
 */
export const deleteMediaCascade = async (mediaId: string): Promise<void> => {
  invariant(mediaId.length > 0, 'deleteMediaCascade: mediaId required');
  await db.transaction('rw', db.media, db.notes, db.pdfAnnotations, async () => {
    const item = await db.media.get(mediaId);
    await db.media.delete(mediaId);
    await db.pdfAnnotations.where('mediaId').equals(mediaId).delete();
    if (item) {
      // `notes` is an encrypted table: a cursor `modify` would bypass the
      // decryption middleware and rewrite raw ciphertext rows. Read through the
      // wrapped `toArray`, clear the link, and write back via `bulkPut` so each
      // note is decrypted on read and re-sealed on write.
      const notes = await db.notes.where('spaceId').equals(item.spaceId).toArray();
      const detached = notes.filter((note) => note.mediaId === mediaId);
      for (const note of detached) delete note.mediaId;
      if (detached.length > 0) await db.notes.bulkPut(detached);
    }
  });
};

import Dexie from 'dexie';
import { db } from '@/db/db';
import type { MediaItem } from '@/db/schema';
import { invariant } from '@/lib/invariant';
import { MAX_PDF_BYTES, countPages, sniffPdfMagic } from '@/lib/pdf-blob';

export type ValidationResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'mime' | 'size' | 'not-pdf' | 'corrupt';
      message: string;
    };

export const validatePdfFile = async (file: File): Promise<ValidationResult> => {
  if (file.type !== 'application/pdf') {
    return { ok: false, reason: 'mime', message: 'Only PDF files are supported.' };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, reason: 'size', message: 'PDF exceeds 50 MB.' };
  }
  const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
  if (!(await sniffPdfMagic(blob))) {
    return { ok: false, reason: 'not-pdf', message: 'File is not a valid PDF.' };
  }
  try {
    await countPages(blob);
  } catch {
    return { ok: false, reason: 'corrupt', message: 'PDF could not be opened.' };
  }
  return { ok: true };
};

export const addMediaItem = async (
  spaceId: string,
  filename: string,
  blob: Blob,
): Promise<MediaItem> => {
  invariant(spaceId.length > 0, 'addMediaItem: spaceId required');
  invariant(filename.length > 0, 'addMediaItem: filename required');
  const pageCount = await countPages(blob);
  const now = Date.now();
  const item: MediaItem = {
    id: crypto.randomUUID(),
    spaceId,
    name: filename,
    mime: 'application/pdf',
    size: blob.size,
    blob,
    pageCount,
    createdAt: now,
    updatedAt: now,
  };
  await db.media.add(item);
  return item;
};

export const deleteMediaItem = async (mediaItemId: string): Promise<void> => {
  invariant(mediaItemId.length > 0, 'deleteMediaItem: mediaItemId required');
  await db.transaction('rw', db.media, db.notes, async () => {
    await db.media.delete(mediaItemId);
    await db.notes
      .where('mediaItemId')
      .equals(mediaItemId)
      .modify({ mediaItemId: undefined });
  });
};

export const getMediaBySpace = async (spaceId: string): Promise<MediaItem[]> => {
  invariant(spaceId.length > 0, 'getMediaBySpace: spaceId required');
  return db.media
    .where('[spaceId+createdAt]')
    .between([spaceId, Dexie.minKey], [spaceId, Dexie.maxKey])
    .reverse()
    .toArray();
};

export const getMediaItem = async (
  mediaItemId: string,
): Promise<MediaItem | undefined> => db.media.get(mediaItemId);

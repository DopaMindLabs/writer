import type { MediaItem, Note, NoteUrlCache } from '@/db/schema';
import { filenameFromUrl } from '@/lib/pdf-url-cache';

export interface ResolvedPdf {
  blob: Blob;
  name: string;
  pageCount: number;
}

export const resolvePdfSource = (
  note: Note,
  cache: NoteUrlCache | null,
  mediaItem: MediaItem | null,
): ResolvedPdf | null => {
  if (note.mediaItemId) {
    return mediaItem
      ? {
          blob: mediaItem.blob,
          name: mediaItem.name,
          pageCount: mediaItem.pageCount,
        }
      : null;
  }
  if (note.pdfUrl && cache?.url === note.pdfUrl) {
    return {
      blob: cache.blob,
      name: filenameFromUrl(cache.url),
      pageCount: cache.pageCount,
    };
  }
  return null;
};

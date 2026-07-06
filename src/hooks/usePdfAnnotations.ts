import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { PdfAnnotation } from '@/db/schema';

const EMPTY: PdfAnnotation[] = [];

/**
 * Live-queries a media item's highlights, ordered by page then creation time.
 * Mirrors `useMediaItems`: the Dexie read is inlined so the hook stays free of
 * heavier facade dependencies. Returns a stable empty array while loading.
 */
export const usePdfAnnotations = (mediaId: string | undefined): PdfAnnotation[] =>
  useLiveQuery(
    async () => {
      if (!mediaId) return EMPTY;
      const items = await db.pdfAnnotations.where('mediaId').equals(mediaId).toArray();
      return items.sort((a, b) => a.page - b.page || a.createdAt - b.createdAt);
    },
    [mediaId],
    EMPTY,
  );

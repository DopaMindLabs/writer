import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { MediaItem } from '@/db/schema';

const EMPTY: MediaItem[] = [];

/**
 * Live-queries a space's media items, newest-first. Mirrors
 * `useNoteAttachments`: the Dexie query is inlined (rather than reusing the
 * `@/lib/media` facade) so this read hook stays free of the pdf.js engine that
 * the facade's validation path pulls in. Returns a stable empty array while
 * there is no space or before the first result resolves.
 */
export const useMediaItems = (spaceId: string | undefined): MediaItem[] =>
  useLiveQuery(
    async () => {
      if (!spaceId) return EMPTY;
      const items = await db.media
        .where('spaceId')
        .equals(spaceId)
        .sortBy('createdAt');
      return items.reverse();
    },
    [spaceId],
    EMPTY,
  );

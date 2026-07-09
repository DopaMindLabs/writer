import { useLiveQuery } from 'dexie-react-hooks';
import { countPdfAnnotationsBySpace } from '@/lib/pdf-annotations';

const EMPTY = new Map<string, number>();

/**
 * Live highlight counts for a space, keyed by media id, for the library list.
 * One indexed query per change (not per row); media with no highlights are
 * absent from the map. Returns a stable empty map while loading or with no space.
 */
export const usePdfAnnotationCounts = (
  spaceId: string | undefined,
): Map<string, number> =>
  useLiveQuery(
    async () => (spaceId ? countPdfAnnotationsBySpace(spaceId) : EMPTY),
    [spaceId],
    EMPTY,
  );

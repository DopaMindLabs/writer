import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { MediaItem } from '@/db/schema';

/**
 * Live-queries a single media item by id. Mirrors `useMediaItems`: the Dexie
 * read is inlined (rather than reusing the `@/lib/media` facade) so this hook
 * stays free of the pdf.js engine the facade's validation path pulls in.
 *
 * Returns `undefined` while the query is in flight and `null` once it resolves
 * to a missing item — letting callers tell "still loading" from "gone".
 */
export const useMediaItem = (id: string | undefined): MediaItem | null | undefined =>
  useLiveQuery(async () => (id ? ((await db.media.get(id)) ?? null) : null), [id]);

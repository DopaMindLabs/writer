import { useLiveQuery } from 'dexie-react-hooks';
import type { MediaItem } from '@/db/schema';
import { getMediaBySpace, getMediaItem } from '@/lib/media';

export const useMediaBySpace = (
  spaceId: string | null | undefined,
): MediaItem[] =>
  useLiveQuery(
    () => (spaceId ? getMediaBySpace(spaceId) : Promise.resolve([])),
    [spaceId],
    [],
  );

export const useMediaItem = (
  mediaItemId: string | null | undefined,
): MediaItem | null =>
  useLiveQuery(
    async () => (mediaItemId ? ((await getMediaItem(mediaItemId)) ?? null) : null),
    [mediaItemId],
    null,
  );

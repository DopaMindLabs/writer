import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Citation } from '@/db/schema';

export function useCitations(spaceId: string | null | undefined): Citation[] {
  return (
    useLiveQuery(
      async () => {
        if (!spaceId) return [];
        return db.citations.where('spaceId').equals(spaceId).sortBy('year');
      },
      [spaceId],
      [],
    ) ?? []
  );
}

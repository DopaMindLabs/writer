import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Citation } from '@/db/schema';

export function useCitations(worldId: string | null | undefined): Citation[] {
  return (
    useLiveQuery(
      async () => {
        if (!worldId) return [];
        return db.citations.where('worldId').equals(worldId).sortBy('year');
      },
      [worldId],
      [],
    ) ?? []
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Note } from '@/db/schema';

export function useNotes(spaceId: string | null | undefined): Note[] {
  return (
    useLiveQuery(
      async () => {
        if (!spaceId) return [];
        return db.notes.where('spaceId').equals(spaceId).toArray();
      },
      [spaceId],
      [],
    ) ?? []
  );
}

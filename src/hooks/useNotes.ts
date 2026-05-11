import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Note } from '@/db/schema';

export function useNotes(worldId: string | null | undefined): Note[] {
  return (
    useLiveQuery(
      async () => {
        if (!worldId) return [];
        return db.notes.where('worldId').equals(worldId).toArray();
      },
      [worldId],
      [],
    ) ?? []
  );
}

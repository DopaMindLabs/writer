import { db } from '@/db/db';
import type { Note } from '@/db/schema';
import { useEncryptedLiveQuery } from './useEncryptedLiveQuery';

export const useNotes = (spaceId: string | null | undefined): Note[] => {
  return useEncryptedLiveQuery(
    async () => {
      if (!spaceId) return [];
      return db.notes.where('spaceId').equals(spaceId).toArray();
    },
    [spaceId],
    [],
  );
};

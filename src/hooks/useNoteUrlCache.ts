import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { NoteUrlCache } from '@/db/schema';

export const useNoteUrlCache = (
  noteId: string | null | undefined,
): NoteUrlCache | null => {
  return useLiveQuery(
    async () => {
      if (!noteId) return null;
      return (await db.noteUrlCache.get(noteId)) ?? null;
    },
    [noteId],
    null,
  );
};

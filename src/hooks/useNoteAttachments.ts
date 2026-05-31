import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { NoteAttachment } from '@/db/schema';

// Live list of a note's image attachments, oldest first.
export const useNoteAttachments = (
  noteId: string | null | undefined,
): NoteAttachment[] => {
  return useLiveQuery(
    async () => {
      if (!noteId) return [];
      return db.noteAttachments
        .where('[noteId+createdAt]')
        .between([noteId, -Infinity], [noteId, Infinity])
        .toArray();
    },
    [noteId],
    [],
  );
};

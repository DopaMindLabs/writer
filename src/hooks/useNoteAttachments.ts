import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { NoteAttachment } from '@/db/schema';

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

const EMPTY_ATTACHMENTS: NoteAttachment[] = [];

export const useNoteAttachmentsBySpace = (
  spaceId: string | null | undefined,
): Map<string, NoteAttachment[]> => {
  return useLiveQuery(
    async () => {
      const byNote = new Map<string, NoteAttachment[]>();
      if (!spaceId) return byNote;
      const rows = await db.noteAttachments
        .where('spaceId')
        .equals(spaceId)
        .toArray();
      for (const row of rows) {
        const list = byNote.get(row.noteId);
        if (list) list.push(row);
        else byNote.set(row.noteId, [row]);
      }
      for (const list of byNote.values()) {
        list.sort((a, b) => a.createdAt - b.createdAt);
      }
      return byNote;
    },
    [spaceId],
    new Map<string, NoteAttachment[]>(),
  );
};

export const attachmentsForNote = (
  byNote: Map<string, NoteAttachment[]>,
  noteId: string,
): NoteAttachment[] => byNote.get(noteId) ?? EMPTY_ATTACHMENTS;

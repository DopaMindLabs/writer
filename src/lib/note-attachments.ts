import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { invariant } from '@/lib/invariant';
import { NoteState, type Note, type NoteAttachment } from '@/db/schema';
import {
  MAX_IMAGE_BYTES,
  MAX_NOTE_IMAGES,
  isAcceptedImageType,
} from '@/data/note-attachments';

export interface AddImagesResult {
  added: NoteAttachment[];
  rejected: string[];
}

const readFileBlob = async (file: File): Promise<Blob> => {
  const buffer = await file.arrayBuffer();
  return new Blob([buffer], { type: file.type });
};

const rejectionReason = (file: File): string | null => {
  if (!isAcceptedImageType(file.type)) {
    return `${file.name}: unsupported type`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name}: larger than 5 MB`;
  }
  return null;
};

const toAttachment = (note: Note, file: File, blob: Blob): NoteAttachment => ({
  id: newId(),
  noteId: note.id,
  spaceId: note.spaceId,
  name: file.name,
  mime: file.type,
  size: file.size,
  blob,
  createdAt: Date.now(),
});

export const addNoteImages = async (
  note: Note,
  files: readonly File[],
): Promise<AddImagesResult> => {
  invariant(note.id, 'addNoteImages: note must have an id');

  const rejected: string[] = [];
  const candidates: NoteAttachment[] = [];
  for (const file of files) {
    const reason = rejectionReason(file);
    if (reason !== null) {
      rejected.push(reason);
      continue;
    }
    candidates.push(toAttachment(note, file, await readFileBlob(file)));
  }

  if (candidates.length === 0) return { added: [], rejected };

  const added = await db.transaction(
    'rw',
    [db.noteAttachments, db.notes],
    async () => {
      const existing = await db.noteAttachments
        .where('noteId')
        .equals(note.id)
        .count();
      const remaining = Math.max(0, MAX_NOTE_IMAGES - existing);
      const accepted = candidates.slice(0, remaining);
      for (const over of candidates.slice(remaining)) {
        rejected.push(`${over.name}: limit of ${String(MAX_NOTE_IMAGES)} reached`);
      }
      if (accepted.length > 0) {
        await db.noteAttachments.bulkAdd(accepted);
        if (note.state !== NoteState.User) {
          await db.notes.update(note.id, { state: NoteState.User });
        }
      }
      return accepted;
    },
  );

  return { added, rejected };
};

export const deleteNoteAttachment = async (id: string): Promise<void> => {
  await db.noteAttachments.delete(id);
};

export const countNoteAttachments = async (noteId: string): Promise<number> => {
  return db.noteAttachments.where('noteId').equals(noteId).count();
};

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

// Adds the given image files to a note, enforcing the per-note image limit and
// accepted MIME types. Returns the attachments that were stored and a list of
// human-readable reasons for any files that were rejected. Promotes a seed note
// to a user note, matching the body/title commit behaviour.
export const addNoteImages = async (
  note: Note,
  files: readonly File[],
): Promise<AddImagesResult> => {
  invariant(note.id, 'addNoteImages: note must have an id');

  const existing = await db.noteAttachments
    .where('noteId')
    .equals(note.id)
    .count();
  let remaining = Math.max(0, MAX_NOTE_IMAGES - existing);

  const added: NoteAttachment[] = [];
  const rejected: string[] = [];

  for (const file of files) {
    const reason = rejectionReason(file);
    if (reason !== null) {
      rejected.push(reason);
      continue;
    }
    if (remaining === 0) {
      rejected.push(`${file.name}: limit of ${String(MAX_NOTE_IMAGES)} reached`);
      continue;
    }
    const blob = await readFileBlob(file);
    const attachment: NoteAttachment = {
      id: newId(),
      noteId: note.id,
      spaceId: note.spaceId,
      name: file.name,
      mime: file.type,
      size: file.size,
      blob,
      createdAt: Date.now(),
    };
    await db.noteAttachments.add(attachment);
    added.push(attachment);
    remaining -= 1;
  }

  if (added.length > 0 && note.state !== NoteState.User) {
    await db.notes.update(note.id, { state: NoteState.User });
  }

  return { added, rejected };
};

export const deleteNoteAttachment = async (id: string): Promise<void> => {
  await db.noteAttachments.delete(id);
};

export const countNoteAttachments = async (noteId: string): Promise<number> => {
  return db.noteAttachments.where('noteId').equals(noteId).count();
};

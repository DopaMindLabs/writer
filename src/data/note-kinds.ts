import type { NoteKind } from '@/db/schema';
import { listNoteTypes } from '@/data/note-types';

export const NOTE_KIND_LABEL = Object.fromEntries(
  listNoteTypes().map((t) => [t.kind, t.label]),
) as Record<NoteKind, string>;

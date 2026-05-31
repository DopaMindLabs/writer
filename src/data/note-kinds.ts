import type { NoteKind } from '@/db/schema';
import { listNoteTypes } from '@/data/note-types';

/**
 * Human-readable label for each note kind, derived from the note-type registry
 * so labels have a single source of truth. Kept as a `Record<NoteKind, string>`
 * for back-compatibility with existing importers.
 */
export const NOTE_KIND_LABEL = Object.fromEntries(
  listNoteTypes().map((t) => [t.kind, t.label]),
) as Record<NoteKind, string>;

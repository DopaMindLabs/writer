import { type Note, type NoteKind, type NoteLayout } from '@/db/schema';
import {
  NOTE_LAYOUT_CONFIG,
  type NoteLayoutConfig,
  type NoteTypeDescriptor,
} from './types';

const modules = import.meta.glob<{ default: NoteTypeDescriptor }>(
  './*.note-type.ts',
  { eager: true },
);

const REGISTRY = Object.fromEntries(
  Object.values(modules).map((m) => [m.default.kind, m.default]),
) as Record<NoteKind, NoteTypeDescriptor>;

const compareForToolbar = (
  a: NoteTypeDescriptor,
  b: NoteTypeDescriptor,
): number => {
  const ao = a.toolbarOrder ?? Number.MAX_SAFE_INTEGER;
  const bo = b.toolbarOrder ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return a.label.localeCompare(b.label);
};

export const getNoteType = (kind: NoteKind): NoteTypeDescriptor => REGISTRY[kind];

export const listNoteTypes = (): NoteTypeDescriptor[] =>
  Object.values(REGISTRY).sort(compareForToolbar);

export const resolveNoteLayout = (
  note: Pick<Note, 'kind' | 'layout'>,
): NoteLayout => note.layout ?? REGISTRY[note.kind].layout;

export const getNoteLayoutConfig = (
  note: Pick<Note, 'kind' | 'layout'>,
): NoteLayoutConfig => NOTE_LAYOUT_CONFIG[resolveNoteLayout(note)];

export { NOTE_LAYOUT_CONFIG } from './types';
export type { NoteTypeDescriptor, NoteLayoutConfig } from './types';

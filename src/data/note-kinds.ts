import { NoteKind } from '@/db/schema';

export const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  [NoteKind.Note]: 'thought',
  [NoteKind.Char]: 'person',
  [NoteKind.Place]: 'place',
  [NoteKind.Lore]: 'lore',
  [NoteKind.Question]: 'question',
  [NoteKind.Source]: 'source',
  [NoteKind.Claim]: 'claim',
  [NoteKind.Figure]: 'figure',
  [NoteKind.Todo]: 'todo',
  [NoteKind.LooseEnd]: 'loose end',
  [NoteKind.Blank]: 'blank',
};

import type { HighlightColor } from '@/theme/tokens';

export interface World {
  id: string;
  tag: string;
  name: string;
  shared: boolean;
  template: string;
  createdAt: number;
  updatedAt: number;
}

export interface Section {
  id: string;
  worldId: string;
  parentSectionId: string | null;
  label: string;
  order: number;
}

export interface Doc {
  id: string;
  worldId: string;
  sectionId: string;
  name: string;
  body: string;
  meta: { wordCount: number; status?: string };
  updatedAt: number;
}

export enum NoteKind {
  Note = 'note',
  Char = 'char',
  Place = 'place',
  Lore = 'lore',
  Question = 'question',
  Source = 'source',
  Claim = 'claim',
  Figure = 'figure',
  Todo = 'todo',
  LooseEnd = 'loose-end',
  Blank = 'blank',
}

export enum NoteState {
  SeedPrompt = 'seed-prompt',
  SeedFetched = 'seed-fetched',
  User = 'user',
}

export interface Note {
  id: string;
  worldId: string;
  l: number;
  t: number;
  w: number;
  h: number;
  kind: NoteKind;
  state: NoteState;
  title?: string;
  body: string;
  createdAt: number;
}

export interface Annotation {
  id: string;
  docId: string;
  rangeStart: number;
  rangeEnd: number;
  kind: 'highlight' | 'inline' | 'side';
  color?: HighlightColor;
  body?: string;
  author: string;
  createdAt: number;
}

export interface Connection {
  id: string;
  worldId: string;
  fromNoteId: string;
  toNoteId: string;
  createdAt: number;
}

export interface Citation {
  id: string;
  worldId: string;
  key: string;
  authors: string;
  title: string;
  year: number;
  type: 'book' | 'article' | 'chapter' | 'misc';
  useCount: number;
  raw?: string;
}

export interface Backup {
  id: string;
  when: number;
  scope: string;
  kind: 'auto' | 'manual' | 'snapshot';
  size: number;
  payload: string;
  label?: string;
}

export interface Settings {
  key: 'global';
  proseFont: string;
  uiFont: string;
  proseSize: number;
  lineHeight: number;
  measure: number;
  theme: 'light' | 'dark';
}

export interface HighlightPalette {
  id: string;
  worldId: string;
  slots: { name: string; color: string }[];
}

export interface Meta {
  key: string;
  value: unknown;
}

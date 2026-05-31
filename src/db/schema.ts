import type { HighlightColor } from '@/theme/tokens';

export interface Space {
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
  spaceId: string;
  parentSectionId: string | null;
  label: string;
  order: number;
}

export interface Doc {
  id: string;
  spaceId: string;
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
  spaceId: string;
  l: number;
  t: number;
  w: number;
  h: number;
  kind: NoteKind;
  state: NoteState;
  title?: string;
  body: string;
  linkedDocId?: string;
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
  spaceId: string;
  fromNoteId: string;
  toNoteId: string;
  createdAt: number;
}

export interface Citation {
  id: string;
  spaceId: string;
  key: string;
  authors: string;
  title: string;
  year: number;
  type: 'book' | 'article' | 'chapter' | 'misc';
  useCount: number;
  raw?: string;
}

export type BackupFormat = 'md-zip';

export interface Backup {
  id: string;
  when: number;
  scope: string;
  kind: 'auto' | 'manual' | 'snapshot';
  format: BackupFormat;
  size: number;
  payload: Blob;
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
  spaceId: string;
  slots: { name: string; color: string }[];
}

export interface Meta {
  key: string;
  value: unknown;
}

// A recorded sync run for a space. Sync is distinct from Backup: it pushes the
// space to the connected folder and is tracked here (not in the backups table).
export interface SyncEntry {
  id: string;
  spaceId: string;
  when: number;
  kind: 'auto' | 'manual';
  status: 'ok' | 'error';
  size: number;
  filename?: string;
  error?: string;
}

// Auto-sync configuration. A single row with spaceId === 'global' holds the
// default; per-space rows override it. intervalMin: 0 = off, INHERIT_INTERVAL
// (-1) = use the global default (per-space rows only).
export interface SyncConfig {
  spaceId: string;
  intervalMin: number;
}

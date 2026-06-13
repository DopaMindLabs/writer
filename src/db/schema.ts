import type { HighlightColor } from '@/theme/tokens';
import type { DocStatus } from '@/lib/docInspector/status';

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
  meta: {
    wordCount: number;
    status?: string;
    wordLimit?: number;
    charLimit?: number;
    dueDate?: number;
  };
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
  Image = 'image',
  Pdf = 'pdf',
}

export enum NoteLayout {
  Text = 'text',
  Image = 'image',
  Pdf = 'pdf',
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
  layout?: NoteLayout;
  typeVersion?: string;
  pdfUrl?: string;
}

export interface NoteUrlCache {
  noteId: string;
  url: string;
  mime: string;
  size: number;
  blob: Blob;
  pageCount: number;
  fetchedAt: number;
}

export interface NoteAttachment {
  id: string;
  noteId: string;
  spaceId: string;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
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

export type RevisionKind = 'auto' | 'manual' | 'baseline';

export interface Revision {
  id: string;
  docId: string;
  body: string;
  text: string;
  wordCount: number;
  kind: RevisionKind;
  label?: string;
  pinned?: boolean;
  createdAt: number;
  meta?: Record<string, unknown>;
}

export type BackupFormat = 'md-zip' | 'archive-v2';

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

export interface SyncConfig {
  spaceId: string;
  intervalMin: number;
}

export type InspectorToggle = 'on' | 'off' | 'inherit';

export interface DocInspectorConfig {
  spaceId: string;
  wordLimit: InspectorToggle;
  charLimit: InspectorToggle;
  status: InspectorToggle;
  dueDate: InspectorToggle;
  highlightOverLimit: InspectorToggle;
  statusStages?: Partial<Record<DocStatus, boolean>>;
}

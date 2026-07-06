import type { HighlightColor } from '@/theme/tokens';
import type { DocStatus } from '@/lib/docInspector/status';
import type { PdfRect } from '@/pdf-annotator/core/types';

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

/**
 * An append-only CRDT update for a document. The editing source of truth for a
 * collaborative doc is the sequence of these payloads; `Doc.body` remains the
 * serialized read model. `engine`/`formatVersion` tag the payload so a future
 * CRDT engine can coexist. Keyed by an auto-increment id (absent before insert).
 */
export interface DocUpdate {
  id?: number;
  docId: string;
  engine: 'yjs';
  formatVersion: 1;
  payload: Uint8Array;
  createdAt: number;
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
  /** Set on PDF source notes; points at a {@link MediaItem}. Unindexed. */
  mediaId?: string;
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

/**
 * An uploaded PDF held in the per-space media library. The bytes live in
 * IndexedDB as a Blob (the noteAttachments precedent); the library and viewer
 * read them locally. Never synced (see cloud `UNSYNCED`).
 */
export interface MediaItem {
  id: string;
  spaceId: string;
  name: string;
  mime: 'application/pdf';
  size: number;
  pageCount: number;
  blob: Blob;
  createdAt: number;
  updatedAt: number;
}

/** The annotator module owns the page-rect type; the schema re-exports it. */
export type { PdfRect };

/** The mark kinds the selection strip can write; all reuse the `hl-*` palette. */
export type PdfAnnotationKind = 'highlight' | 'underline' | 'strikethrough';

/**
 * A highlight on an uploaded PDF, anchored to the media item (not a note) so it
 * survives note deletion and has a single cascade path. `spaceId` is denormalised
 * for space-scoped cascade and archive. Reuses the editor's {@link HighlightColor}
 * palette so theming (including the AAA high-contrast themes) comes for free.
 * Never synced (see cloud `UNSYNCED`).
 */
export interface PdfAnnotation {
  id: string;
  mediaId: string;
  spaceId: string;
  kind: PdfAnnotationKind;
  page: number;
  rects: PdfRect[];
  quote: string;
  color: HighlightColor;
  note?: string;
  author: string;
  createdAt: number;
  updatedAt: number;
}

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
  /**
   * The access-control realm this row belongs to, when its space has been
   * shared. Absent means the creator's private realm — the default, and the
   * only state until a space is shared. Stamped by the sync layer and kept
   * plaintext on the wire (it is in `CLOUD_RESERVED`) so the server can enforce
   * access; the row's content is sealed around it.
   */
  realmId?: string;
}

export interface Section {
  id: string;
  spaceId: string;
  parentSectionId: string | null;
  label: string;
  order: number;
  /** Access-control realm; see {@link Space.realmId}. */
  realmId?: string;
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
  /**
   * Position within its section, ascending. Optional and unindexed: legacy rows
   * without it sort after ordered ones in insertion order, and it is assigned
   * densely (0..n-1) whenever the section is reordered. Not an index, so it
   * needs no schema version bump and syncs encrypted like the rest of the row.
   */
  order?: number;
  updatedAt: number;
  /** Access-control realm; see {@link Space.realmId}. */
  realmId?: string;
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
  /** When the note was last opened, if ever (epoch ms). */
  openedAt?: number;
  layout?: NoteLayout;
  typeVersion?: string;
  /** Access-control realm; see {@link Space.realmId}. */
  realmId?: string;
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
  /** Access-control realm; see {@link Space.realmId}. */
  realmId?: string;
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
  /** Access-control realm; see {@link Space.realmId}. */
  realmId?: string;
}

export interface Connection {
  id: string;
  spaceId: string;
  fromNoteId: string;
  toNoteId: string;
  createdAt: number;
  /** Access-control realm; see {@link Space.realmId}. */
  realmId?: string;
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
  /** Access-control realm; see {@link Space.realmId}. */
  realmId?: string;
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
  /** Access-control realm; see {@link Space.realmId}. */
  realmId?: string;
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
  /** Access-control realm; see {@link Space.realmId}. */
  realmId?: string;
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

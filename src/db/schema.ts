import type { HighlightColor } from '@/theme/tokens';
import type { DocStatus } from '@/lib/docInspector/status';
import type { ReplicatedEntityMetadata } from 'writer-sync/core';

/**
 * Every synced content row carries {@link ReplicatedEntityMetadata}: a
 * provider-neutral access scope, audit attribution and convergence metadata. A
 * provider-specific id such as a Dexie Cloud realm never appears on a domain
 * row — it lives on the adapter row (`DexieRow` in the cloud adapter) instead.
 */
export interface Space extends ReplicatedEntityMetadata {
  id: string;
  tag: string;
  name: string;
  shared: boolean;
  template: string;
  createdAt: number;
  updatedAt: number;
}

export interface Section extends ReplicatedEntityMetadata {
  id: string;
  spaceId: string;
  parentSectionId: string | null;
  label: string;
  order: number;
}

export interface Doc extends ReplicatedEntityMetadata {
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

export interface Note extends ReplicatedEntityMetadata {
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
}

export interface NoteAttachment extends ReplicatedEntityMetadata {
  id: string;
  noteId: string;
  spaceId: string;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
  createdAt: number;
}

/**
 * One bounded piece of an attachment's already-sealed ciphertext.
 *
 * The compound primary key keeps a transfer resumable by attachment and
 * position. `bytes` is base64 rather than binary so the Dexie Cloud adapter
 * leaves it inline instead of replacing it with an addon-managed blob ref.
 */
export interface SyncAttachmentChunk {
  attachmentId: string;
  index: number;
  accessScopeId: string;
  bytes: string;
}

export interface Annotation extends ReplicatedEntityMetadata {
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

export interface Connection extends ReplicatedEntityMetadata {
  id: string;
  spaceId: string;
  fromNoteId: string;
  toNoteId: string;
  createdAt: number;
}

export interface Citation extends ReplicatedEntityMetadata {
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

export interface Revision extends ReplicatedEntityMetadata {
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

export interface HighlightPalette extends ReplicatedEntityMetadata {
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

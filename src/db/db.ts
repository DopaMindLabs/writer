import Dexie, { type Table } from 'dexie';
import type {
  Space,
  Section,
  Doc,
  Note,
  NoteAttachment,
  Annotation,
  Citation,
  Connection,
  Backup,
  Revision,
  Settings,
  HighlightPalette,
  Meta,
  SyncEntry,
  SyncConfig,
  DocInspectorConfig,
  DocSyncUpdateRow,
  DocSyncMetaRow,
} from './schema';

export class LoremDB extends Dexie {
  spaces!: Table<Space, string>;
  sections!: Table<Section, string>;
  docs!: Table<Doc, string>;
  notes!: Table<Note, string>;
  noteAttachments!: Table<NoteAttachment, string>;
  annotations!: Table<Annotation, string>;
  citations!: Table<Citation, string>;
  connections!: Table<Connection, string>;
  backups!: Table<Backup, string>;
  revisions!: Table<Revision, string>;
  settings!: Table<Settings, string>;
  palettes!: Table<HighlightPalette, string>;
  meta!: Table<Meta, string>;
  syncs!: Table<SyncEntry, string>;
  syncConfigs!: Table<SyncConfig, string>;
  docInspectorConfigs!: Table<DocInspectorConfig, string>;
  docSyncUpdates!: Table<DocSyncUpdateRow, number>;
  docSyncMeta!: Table<DocSyncMetaRow, string>;

  constructor(name = 'lipsum') {
    super(name);
    this.version(1).stores({
      spaces: 'id, createdAt, updatedAt',
      sections:
        'id, spaceId, parentSectionId, order, [spaceId+order], [spaceId+parentSectionId]',
      docs: 'id, spaceId, sectionId, updatedAt, [spaceId+sectionId]',
      notes: 'id, spaceId, kind, createdAt',
      noteAttachments: 'id, noteId, spaceId, [noteId+createdAt]',
      annotations: 'id, docId, kind, createdAt',
      citations: 'id, spaceId, year, [spaceId+key], [spaceId+year]',
      connections:
        'id, spaceId, fromNoteId, toNoteId, [spaceId+fromNoteId], [spaceId+toNoteId]',
      backups: 'id, when, scope, kind',
      revisions: 'id, docId, createdAt, kind, [docId+createdAt]',
      settings: 'key',
      palettes: 'id, spaceId',
      meta: 'key',
      syncs: 'id, spaceId, when, [spaceId+when]',
      syncConfigs: 'spaceId',
      docInspectorConfigs: 'spaceId',
      docSyncUpdates: '++seq, docId',
      docSyncMeta: 'docId',
    });
  }
}

export const db = new LoremDB();

if (import.meta.env.DEV) {
  (window as unknown as { db: LoremDB }).db = db;
}

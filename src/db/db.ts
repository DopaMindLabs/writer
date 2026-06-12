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

const setupEarlyVersions = (db: LoremDB) => {
  db.version(1).stores({
    spaces: 'id, updatedAt',
    sections: 'id, spaceId, order, [spaceId+order]',
    docs: 'id, spaceId, sectionId, updatedAt, [spaceId+sectionId]',
    notes: 'id, spaceId, kind, createdAt',
    annotations: 'id, docId, kind, createdAt',
    citations: 'id, spaceId, year, [spaceId+key]',
    backups: 'id, when, scope, kind',
    settings: 'key',
    palettes: 'id, spaceId',
    meta: 'key',
  });

  db.version(2)
    .stores({
      sections:
        'id, spaceId, parentSectionId, order, [spaceId+order], [spaceId+parentSectionId]',
    })
    .upgrade(async (tx) => {
      await tx
        .table('sections')
        .toCollection()
        .modify((s: { parentSectionId?: string | null }) => {
          if (s.parentSectionId === undefined) s.parentSectionId = null;
        });
    });

  db.version(3).stores({
    connections:
      'id, spaceId, fromNoteId, toNoteId, [spaceId+fromNoteId], [spaceId+toNoteId]',
  });

  db.version(4).upgrade(async (tx) => {
    await tx
      .table('notes')
      .toCollection()
      .modify((n: { state?: string }) => {
        n.state ??= 'user';
      });
  });

  db.version(5).stores({
    spaces: 'id, createdAt, updatedAt',
  });
};

const setupLaterVersions = (db: LoremDB) => {
  db.version(6).stores({
    syncs: 'id, spaceId, when, [spaceId+when]',
    syncConfigs: 'spaceId',
  });

  db.version(7).stores({
    noteAttachments: 'id, noteId, spaceId, [noteId+createdAt]',
  });

  db.version(8).stores({
    revisions: 'id, docId, createdAt, kind, [docId+createdAt]',
  });

  db.version(9).stores({
    docInspectorConfigs: 'spaceId',
  });

  db.version(10).stores({
    citations: 'id, spaceId, year, [spaceId+key], [spaceId+year]',
  });

  db.version(11).stores({
    docSyncUpdates: '++seq, docId',
    docSyncMeta: 'docId',
  });
};

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
    setupEarlyVersions(this);
    setupLaterVersions(this);
  }
}

export const db = new LoremDB();

if (import.meta.env.DEV) {
  (window as unknown as { db: LoremDB }).db = db;
}

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

  constructor(name = 'lipsum') {
    super(name);
    this.version(1).stores({
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

    this.version(2)
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

    this.version(3).stores({
      connections:
        'id, spaceId, fromNoteId, toNoteId, [spaceId+fromNoteId], [spaceId+toNoteId]',
    });

    this.version(4).upgrade(async (tx) => {
      await tx
        .table('notes')
        .toCollection()
        .modify((n: { state?: string }) => {
          n.state ??= 'user';
        });
    });

    this.version(5).stores({
      spaces: 'id, createdAt, updatedAt',
    });

    this.version(6).stores({
      syncs: 'id, spaceId, when, [spaceId+when]',
      syncConfigs: 'spaceId',
    });

    this.version(7).stores({
      noteAttachments: 'id, noteId, spaceId, [noteId+createdAt]',
    });

    this.version(8).stores({
      revisions: 'id, docId, createdAt, kind, [docId+createdAt]',
    });

    this.version(9).stores({
      docInspectorConfigs: 'spaceId',
    });

    this.version(10).stores({
      citations: 'id, spaceId, year, [spaceId+key], [spaceId+year]',
    });
  }
}

export const db = new LoremDB();

if (import.meta.env.DEV) {
  (window as unknown as { db: LoremDB }).db = db;
}

import Dexie, { type Table } from 'dexie';
import type {
  Space,
  Section,
  Doc,
  Note,
  Annotation,
  Citation,
  Connection,
  Backup,
  Settings,
  HighlightPalette,
  Meta,
} from './schema';

export class LoremDB extends Dexie {
  spaces!: Table<Space, string>;
  sections!: Table<Section, string>;
  docs!: Table<Doc, string>;
  notes!: Table<Note, string>;
  annotations!: Table<Annotation, string>;
  citations!: Table<Citation, string>;
  connections!: Table<Connection, string>;
  backups!: Table<Backup, string>;
  settings!: Table<Settings, string>;
  palettes!: Table<HighlightPalette, string>;
  meta!: Table<Meta, string>;

  constructor() {
    super('lipsum');
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
          if (n.state === undefined) n.state = 'user';
        });
    });

    this.version(5).stores({
      spaces: 'id, createdAt, updatedAt',
    });
  }
}

export const db = new LoremDB();

if (import.meta.env.DEV) {
  (window as unknown as { db: LoremDB }).db = db;
}

import Dexie, { type Table } from 'dexie';
import type {
  World,
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
  worlds!: Table<World, string>;
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
    super('lorem');
    this.version(1).stores({
      worlds: 'id, updatedAt',
      sections: 'id, worldId, order, [worldId+order]',
      docs: 'id, worldId, sectionId, updatedAt, [worldId+sectionId]',
      notes: 'id, worldId, kind, createdAt',
      annotations: 'id, docId, kind, createdAt',
      citations: 'id, worldId, year, [worldId+key]',
      backups: 'id, when, scope, kind',
      settings: 'key',
      palettes: 'id, worldId',
      meta: 'key',
    });

    this.version(2)
      .stores({
        sections:
          'id, worldId, parentSectionId, order, [worldId+order], [worldId+parentSectionId]',
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
        'id, worldId, fromNoteId, toNoteId, [worldId+fromNoteId], [worldId+toNoteId]',
    });
  }
}

export const db = new LoremDB();

if (import.meta.env.DEV) {
  (window as unknown as { db: LoremDB }).db = db;
}

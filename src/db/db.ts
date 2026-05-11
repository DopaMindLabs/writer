import Dexie, { type Table } from 'dexie';
import type {
  World,
  Section,
  Doc,
  Note,
  Annotation,
  Citation,
  Backup,
  Settings,
  HighlightPalette,
  Meta,
} from './schema';

export class LotemDB extends Dexie {
  worlds!: Table<World, string>;
  sections!: Table<Section, string>;
  docs!: Table<Doc, string>;
  notes!: Table<Note, string>;
  annotations!: Table<Annotation, string>;
  citations!: Table<Citation, string>;
  backups!: Table<Backup, string>;
  settings!: Table<Settings, string>;
  palettes!: Table<HighlightPalette, string>;
  meta!: Table<Meta, string>;

  constructor() {
    super('lotem');
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
  }
}

export const db = new LotemDB();

if (import.meta.env.DEV) {
  (window as unknown as { db: LotemDB }).db = db;
}

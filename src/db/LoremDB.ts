import Dexie, { type Table } from 'dexie';
import type {
  Space,
  Section,
  Doc,
  DocUpdate,
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
import { STORES } from './stores';

export class LoremDB extends Dexie {
  spaces!: Table<Space, string>;
  sections!: Table<Section, string>;
  docs!: Table<Doc, string>;
  docUpdates!: Table<DocUpdate, number>;
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
    this.version(1).stores(STORES);
  }
}

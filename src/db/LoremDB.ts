import Dexie, { type Table, type DexieOptions } from 'dexie';
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
  MediaItem,
  PdfAnnotation,
} from './schema';
import type { EscrowRecord } from '@/lib/cloud/crypto/keys';
import { BASE_STORES, PDF_STORES } from './stores';

/**
 * Construction options for {@link LoremDB}. `cloud` opts the instance into the
 * encrypted cloud-sync schema — a single extra store, `cloudCrypto`, holding the
 * passphrase-wrapped master secret (escrow) that lets another device recover the
 * key. The device's own derived key ring lives in a separate, never-synced
 * database (see `@/lib/cloud/crypto/keyStore`), so it is deliberately absent here.
 */
export interface LoremDBOptions {
  addons?: DexieOptions['addons'];
  cloud?: boolean;
}

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
  media!: Table<MediaItem, string>;
  pdfAnnotations!: Table<PdfAnnotation, string>;
  /** Present only on cloud-enabled instances (`options.cloud`). */
  cloudCrypto!: Table<EscrowRecord, string>;

  constructor(name = 'lipsum', options: LoremDBOptions = {}) {
    super(name, options.addons ? { addons: options.addons } : undefined);
    // version(1) is the shipped base schema; later versions only declare new or
    // changed tables so existing installs upgrade without touching their data.
    const base = options.cloud ? { ...BASE_STORES, cloudCrypto: 'id' } : BASE_STORES;
    this.version(1).stores(base);
    this.version(2).stores(PDF_STORES);
  }
}

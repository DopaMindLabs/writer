import Dexie, { type Table, type DexieOptions } from 'dexie';
import type {
  Space,
  Section,
  Doc,
  DocUpdate,
  Note,
  NoteAttachment,
  SyncAttachmentChunk,
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
import type { EscrowRecord } from '@/lib/cloud/crypto/keys';
import type { DeviceRecord } from '@/lib/cloud/devicePolicy';
import type {
  EncryptedSyncFrame,
  SyncInboxEntry,
  SyncTombstone,
} from 'writer-sync/operations';
import type { SyncProviderBinding, TrustedDeviceRecord } from 'writer-sync/core';
import { STORES } from './stores';

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
  /** The append-only operation journal — immutable encrypted frames. */
  syncOperations!: Table<EncryptedSyncFrame, string>;
  /** Bounded pieces of already-sealed attachment ciphertext. */
  syncAttachmentChunks!: Table<SyncAttachmentChunk, [string, number]>;
  /** Accepted operation ids and their materialisation result. */
  syncInbox!: Table<SyncInboxEntry, string>;
  /** Deletion tombstones with acknowledgement state. */
  syncTombstones!: Table<SyncTombstone, [string, string]>;
  /** Local provider configuration per access scope. */
  syncProviderBindings!: Table<SyncProviderBinding, [string, string]>;
  /** Peers this device has paired with — the authentication boundary. */
  trustedDevices!: Table<TrustedDeviceRecord, string>;
  /** Present only on cloud-enabled instances (`options.cloud`). */
  cloudCrypto!: Table<EscrowRecord, string>;
  /** Present only on cloud-enabled instances (`options.cloud`). */
  cloudDevices!: Table<DeviceRecord, string>;

  constructor(name = 'lipsum', options: LoremDBOptions = {}) {
    super(name, options.addons ? { addons: options.addons } : undefined);
    const cloudStores: Record<string, string> = options.cloud
      ? { cloudCrypto: 'id', cloudDevices: 'id' }
      : {};
    // One declared version while Writer is pre-release — see the note on
    // {@link STORES}. New tables are added there, not behind a new version.
    this.version(1).stores({ ...STORES, ...cloudStores });
  }
}

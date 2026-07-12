import dexieCloud from 'dexie-cloud-addon';
import { invariant } from '@/lib/invariant';
import {
  applyCloudFlagFromUrl,
  readCloudFlag,
  markCloudProvisioned,
  wasCloudProvisioned,
} from '@/lib/cloud/flag';
import { cloudDatabaseUrl, hasCloudEnv } from '@/lib/cloud/env';
import { createEncryptionMiddleware } from '@/lib/cloud/crypto/middleware';
import { deviceKeyProvider } from '@/lib/cloud/crypto/keyStore';
import { LoremDB } from './LoremDB';

/**
 * Local-only tables that must never leave the device: preferences, backups, sync
 * bookkeeping and the per-doc CRDT update log. Everything else is content that
 * syncs (field-encrypted) plus `cloudCrypto` (the passphrase-wrapped escrow,
 * which must sync so a second device can recover the key).
 */
const UNSYNCED = [
  'settings',
  'backups',
  'syncs',
  'syncConfigs',
  'docInspectorConfigs',
  'meta',
  'docUpdates',
] as const;

/**
 * Constructs the app database. It builds a Dexie Cloud instance with the
 * encryption middleware when the beta is active — both gates on, or a device
 * already provisioned (see {@link wasCloudProvisioned}: the cloud schema is
 * sticky so opting out never destroys local data) — and otherwise returns the
 * plain local database, byte-for-byte the pre-cloud behaviour. The addon is
 * imported statically (accepted bundle cost) and passed per-instance, never via
 * the global `Dexie.addons`.
 */
export const buildDb = (name = 'lipsum'): LoremDB => {
  applyCloudFlagFromUrl();
  const cloud = hasCloudEnv() && (readCloudFlag() || wasCloudProvisioned());
  if (!cloud) return new LoremDB(name);

  const databaseUrl = cloudDatabaseUrl();
  invariant(databaseUrl, 'cloud sync enabled without a database URL');
  markCloudProvisioned();
  const db = new LoremDB(name, { addons: [dexieCloud], cloud: true });
  db.cloud.configure({
    databaseUrl,
    requireAuth: false,
    customLoginGui: true,
    socialAuth: false,
    tryUseServiceWorker: false,
    unsyncedTables: [...UNSYNCED],
    // Never offload a synced value to blob storage. Content is sealed into an
    // inline base64 string envelope (see envelope.ts); keeping it inline avoids
    // the addon's blob-ref lifecycle, which is incompatible with the encryption
    // middleware and otherwise drops large docs on the receiving device.
    largeStringThreshold: Infinity,
  });
  db.use(createEncryptionMiddleware(deviceKeyProvider));
  return db;
};

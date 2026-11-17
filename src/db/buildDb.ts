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
import { writerJournalDeps } from '@/lib/writerSyncIntegration/materialization/writerJournalDeps';
import { createOperationJournalMiddleware } from '@/lib/writerSyncIntegration/materialization/operationJournalMiddleware';
import {
  localOnlyTables,
  rowEnvelopeTables,
} from '@/lib/writerSyncIntegration/writerTablePolicy';
import { LoremDB } from './LoremDB';

/**
 * Tables the Dexie Cloud addon must not replicate, derived from the
 * authoritative table policy so replication can never drift from the
 * classification.
 *
 * Two groups compose it: the local-only tables (preferences, backups, sync
 * bookkeeping, the CRDT update log and the operation-protocol receiver state),
 * and — since the frame cutover — the materialised content tables. Writer owns
 * its materialised rows as local projections; what replicates is the
 * `syncOperations` journal of immutable encrypted frames, plus `cloudCrypto`
 * (the passphrase-wrapped escrow) and the addon's own control tables.
 */
const UNSYNCED: readonly string[] = [...localOnlyTables(), ...rowEnvelopeTables()];

/**
 * Outbound framing dependencies: keys resolve through the same provider the
 * encryption middleware polls, and both the frame's device attribution and the
 * key that signs it come from this device's cryptographic identity — read
 * together so a signature can never claim a device id it does not belong to.
 */

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
  if (!cloud) {
    // Local row encryption is independent of any provider: a P2P-only Writer
    // must not become a plaintext local database merely because no cloud URL is
    // configured. Pre-setup the resolver holds no key, so the middleware passes
    // plaintext through — the keyless local-first flow is unchanged.
    const db = new LoremDB(name);
    db.use(createEncryptionMiddleware(deviceKeyProvider));
    db.use(createOperationJournalMiddleware(writerJournalDeps));
    return db;
  }

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
  db.use(createOperationJournalMiddleware(writerJournalDeps));
  return db;
};

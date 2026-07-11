import { invariant } from '@/lib/invariant';
import { db as appDb } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import { SYNCED_TABLES, CIPHER_FIELD } from './crypto/tableRules';
import {
  generateMasterSecret,
  deriveKeyRing,
  calibrateIterations,
  wrapMasterSecret,
  unwrapMasterSecret,
  fingerprintsEqual,
  ESCROW_ID,
} from './crypto/keys';
import { openRow, type RowRef } from './crypto/envelope';
import { EscrowMissingError } from './crypto/errors';
import type { CloudKeyRing } from './crypto/keys';
import { encodeRecoveryCode, decodeRecoveryCode } from './crypto/recoveryCode';
import {
  saveDeviceKeyRing,
  forgetDeviceKeyRing,
  savePendingEscrow,
  loadPendingEscrow,
  clearPendingEscrow,
} from './crypto/keyStore';
import { keyMismatchState } from './crypto/keyMismatch';

/** The initial key epoch (the escrow row id comes from `./crypto/keys`). */
const EPOCH = 1;

type Row = Record<string, unknown>;

const pkOf = (db: LoremDB, table: string, row: Row): string =>
  String(row[db.table(table).schema.primKey.keyPath as string]);

/**
 * Best-effort synchronous read of whether the cloud user is signed into an
 * account. Reads the addon's `currentUser` snapshot; `false` on a plain database
 * or before the addon has resolved a user. Kept local to avoid importing the
 * cloud-client facade (which re-exports this module).
 */
const isCloudUserSignedIn = (db: LoremDB): boolean => {
  const cloud = (
    db as { cloud?: { currentUser?: { value?: { isLoggedIn?: boolean } } } }
  ).cloud;
  return cloud?.currentUser?.value?.isLoggedIn ?? false;
};

/**
 * Drop a residual escrow row from the local database, tolerating a plain
 * (non-cloud) database that has no `cloudCrypto` store. Only ever called while
 * the device is signed out, where such a row can only be stale local residue.
 */
const dropResidualEscrow = async (db: LoremDB): Promise<void> => {
  try {
    await db.cloudCrypto.delete(ESCROW_ID);
  } catch {
    /* non-cloud database: no cloudCrypto store to clear */
  }
};

/**
 * One-shot, idempotent re-seal of any content written while the device was
 * keyless. The middleware leaves `openCursor` unwrapped, so `filter` sees rows
 * exactly as stored: those without {@link CIPHER_FIELD} are still plaintext.
 * Re-putting them runs the middleware's seal-on-write and marks them dirty, so
 * the addon queues them for the initial push.
 */
export const sealExistingRows = async (db: LoremDB = appDb): Promise<void> => {
  for (const table of SYNCED_TABLES) {
    const store = db.table<Row>(table);
    const plaintext = await store.filter((row) => !(CIPHER_FIELD in row)).toArray();
    if (plaintext.length > 0) await store.bulkPut(plaintext);
  }
};

/**
 * Whether any synced table holds a **plaintext** (unsealed) row — writing done on
 * this device before encryption was set up. Keeps the first device on
 * passphrase-before-sign-in: it must seal that writing before it can sync, so
 * plaintext never leaves it. A clean device (no such rows) may sign in first and
 * unlock after. Reads through a cursor filter (unwrapped by the middleware) so it
 * sees rows exactly as stored at rest.
 */
export const hasPlaintextSyncedRows = async (
  db: LoremDB = appDb,
): Promise<boolean> => {
  for (const table of SYNCED_TABLES) {
    const plaintext = await db
      .table<Row>(table)
      .filter((row) => !(CIPHER_FIELD in row))
      .first();
    if (plaintext) return true;
  }
  return false;
};

/**
 * Provision cloud encryption: mint a master secret, wrap it under the passphrase
 * for escrow, derive and store the device key ring, seal existing rows, and
 * return the one-time recovery code for the UI to show once.
 *
 * The escrow is held on the device ({@link savePendingEscrow}), **not** written
 * to the synced `cloudCrypto` table. Reconciliation publishes it only once
 * sign-in proves the account has no escrow yet — so two devices can never race
 * their escrows over one row and clobber the account's key.
 */
export const createCloudEncryption = async (
  passphrase: string,
  db: LoremDB = appDb,
  isSignedIn: (db: LoremDB) => boolean = isCloudUserSignedIn,
): Promise<string> => {
  // Fresh setup mints a brand-new master, so any escrow already in the local
  // database is protected by a *different* key. While signed out, that row can
  // only be residue from an earlier local session (a live account's escrow is
  // pulled only while signed in) — drop it, so the escrow reconciler cannot
  // later read its stale fingerprint and lock this device out with a spurious
  // mismatch. Signed in, the row is the account's real escrow: leave it for the
  // mismatch/adopt flow, never delete it here.
  if (!isSignedIn(db)) await dropResidualEscrow(db);
  const master = generateMasterSecret();
  const iterations = await calibrateIterations();
  const escrow = await wrapMasterSecret(master, passphrase, iterations);
  await savePendingEscrow(escrow);
  await saveDeviceKeyRing(await deriveKeyRing(master, escrow.epoch));
  await sealExistingRows(db);
  return encodeRecoveryCode(master);
};

/** What {@link publishPendingEscrow} did with this device's held-back escrow. */
export type EscrowPublishResult = 'published' | 'kept-server' | 'none';

/**
 * Publish the device's held-back escrow to the synced `cloudCrypto` table —
 * **add-only**. Inside one transaction it refuses to overwrite an existing `v1`
 * row whose fingerprint differs (that is another device's account key: report
 * `'kept-server'` and leave the pending escrow in place); it publishes only into
 * an empty slot or over an identical row, then drops the local copy. `'none'`
 * when nothing is pending. This is the last line of defence against a
 * last-writer-wins clobber of the account key on the single escrow row.
 */
export const publishPendingEscrow = async (
  db: LoremDB = appDb,
): Promise<EscrowPublishResult> => {
  const escrow = await loadPendingEscrow();
  if (!escrow) return 'none';
  const result = await db.transaction('rw', db.cloudCrypto, async () => {
    const existing = await db.cloudCrypto.get(ESCROW_ID);
    if (existing && !fingerprintsEqual(existing.fingerprint, escrow.fingerprint)) {
      return 'kept-server' as const;
    }
    await db.cloudCrypto.put(escrow);
    return 'published' as const;
  });
  if (result === 'published') await clearPendingEscrow();
  return result;
};

/**
 * Unlock an already-provisioned device with the passphrase. A wrong passphrase
 * throws {@link WrongPassphraseError} before any key is saved, leaving the
 * device keyless.
 */
export const unlockCloudEncryption = async (
  passphrase: string,
  db: LoremDB = appDb,
): Promise<void> => {
  const escrow = await db.cloudCrypto.get(ESCROW_ID);
  // A missing escrow is a flow condition, not a bad passphrase: on a fresh device
  // the account's escrow only arrives after sign-in. Raise a distinct error so
  // the UI can say "sign in first" rather than "wrong passphrase".
  if (!escrow) throw new EscrowMissingError();
  const master = await unwrapMasterSecret(escrow, passphrase);
  await saveDeviceKeyRing(await deriveKeyRing(master, escrow.epoch));
  await sealExistingRows(db);
};

/** The first stored ciphertext row, if any, for verifying a recovered key. */
const findSealedRow = async (
  db: LoremDB,
): Promise<{ ref: RowRef; row: Row } | null> => {
  for (const table of SYNCED_TABLES) {
    const row = await db.table<Row>(table).filter((r) => CIPHER_FIELD in r).first();
    if (row) return { ref: { table, primaryKey: pkOf(db, table, row) }, row };
  }
  return null;
};

/**
 * Recover on a device with no passphrase, from the printed recovery code. The
 * master re-derives the same ring; if any ciphertext already exists it is
 * test-decrypted to reject a wrong code (a bad checksum is caught earlier by
 * {@link decodeRecoveryCode}).
 */
export const recoverCloudEncryption = async (
  recoveryCode: string,
  db: LoremDB = appDb,
): Promise<void> => {
  const master = decodeRecoveryCode(recoveryCode);
  const escrow = await db.cloudCrypto.get(ESCROW_ID);
  const ring: CloudKeyRing = await deriveKeyRing(master, escrow?.epoch ?? EPOCH);
  // A wrong code derives a wrong ring; opening a known ciphertext row throws
  // EnvelopeIntegrityError, so we reject before saving it as the device key.
  const sealed = await findSealedRow(db);
  if (sealed) await openRow(ring, sealed.ref, sealed.row);
  await saveDeviceKeyRing(ring);
  await sealExistingRows(db);
};

/** Forget the device's key ring and any escrow it was holding; the published
 *  escrow and other devices are untouched. */
export const forgetThisDevice = async (): Promise<void> => {
  await forgetDeviceKeyRing();
  await clearPendingEscrow();
};

/**
 * Collect every synced-table row that decrypts under the *current* ring, one row
 * at a time so a single undecryptable row (sealed under a different key) is
 * skipped rather than failing the whole read. These are the rows this device
 * wrote under its own key; the ones it skips are already under the account key.
 */
const collectDecryptableRows = async (
  db: LoremDB,
): Promise<Map<string, Row[]>> => {
  const collected = new Map<string, Row[]>();
  for (const table of SYNCED_TABLES) {
    const store = db.table<Row>(table);
    const keys = await store.toCollection().primaryKeys();
    const rows: Row[] = [];
    for (const key of keys) {
      // A row sealed under the account's key reads back undefined and is skipped
      // — it is already correct once this device adopts that key below.
      const row = await store.get(key);
      if (row) rows.push(row);
    }
    collected.set(table, rows);
  }
  return collected;
};

/**
 * Resolve a key mismatch by adopting the account's existing key. Unwrap the
 * account escrow with the passphrase it was created under (a wrong one throws
 * {@link WrongPassphraseError} before anything changes), swap the device to that
 * key, and re-seal the rows this device had written under its own key so they
 * survive. The account master is then re-wrapped under the passphrase chosen at
 * this device's setup, so the user keeps a single passphrase from here on.
 */
export const adoptAccountKey = async (
  accountPassphrase: string,
  keepPassphrase: string,
  db: LoremDB = appDb,
): Promise<void> => {
  const serverEscrow = await db.cloudCrypto.get(ESCROW_ID);
  invariant(serverEscrow, 'no account escrow to adopt');
  const master = await unwrapMasterSecret(serverEscrow, accountPassphrase);
  // Collect the device's own rows (readable under its current key) before the
  // swap; reads are never blocked, so this runs even while mismatched.
  const own = await collectDecryptableRows(db);
  await saveDeviceKeyRing(await deriveKeyRing(master, serverEscrow.epoch));
  // The device now holds the account key — the mismatch is resolved, so clear it
  // before re-sealing (the write lock would otherwise refuse the bulkPut).
  keyMismatchState.set(false);
  for (const [table, rows] of own) {
    if (rows.length > 0) await db.table<Row>(table).bulkPut(rows);
  }
  const iterations = await calibrateIterations();
  await db.cloudCrypto.put(
    await wrapMasterSecret(master, keepPassphrase, iterations),
  );
  await clearPendingEscrow();
};

/**
 * The mismatch escape hatch: drop the account's rows this device cannot read
 * (they were sealed under the key it lacks) so the deletions sync away, while
 * keeping the notes this device wrote itself, then publish its held-back escrow
 * so its key becomes the account's. Used when the account passphrase is lost.
 *
 * The escrow swap runs **only when this device holds a pending escrow** to
 * install. A mismatched device without one (its pending copy was cleared, or its
 * ring came from an earlier unlock) has no key to publish: deleting the account
 * escrow would leave the whole account keyless and orphan every other device —
 * so the account key, and the mismatch, stay in place and only the unreadable
 * rows are erased. If no account escrow exists either, there is nothing the
 * mismatch flag can protect, so it clears.
 */
export const eraseSyncedContent = async (
  db: LoremDB = appDb,
): Promise<void> => {
  for (const table of SYNCED_TABLES) {
    const store = db.table<Row>(table);
    const keys = await store.toCollection().primaryKeys();
    for (const key of keys) {
      // A key from primaryKeys() always names a row that exists, so a read that
      // comes back empty is an unreadable row (sealed under the account key this
      // device lacks) — drop it so the deletion syncs away. Reads no longer throw
      // on such a row; they return undefined.
      if (!(await store.get(key))) await store.delete(key);
    }
  }
  if ((await loadPendingEscrow()) === null) {
    // No key to install. A foreign account escrow must survive (deleting it
    // with nothing to publish would leave the whole account keyless), so the
    // mismatch stays until the user adopts or unlocks. With no account escrow
    // at all there is nothing the flag can protect — clear it.
    if ((await db.cloudCrypto.get(ESCROW_ID)) === undefined) {
      keyMismatchState.set(false);
    }
    return;
  }
  // The escape hatch intends replacement: drop the foreign account escrow (the
  // deletion syncs away like the content deletes) so the add-only publish below
  // installs this device's key as the account's.
  await db.cloudCrypto.delete(ESCROW_ID);
  await publishPendingEscrow(db);
  keyMismatchState.set(false);
};

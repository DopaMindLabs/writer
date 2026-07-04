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
} from './crypto/keys';
import { openRow, type RowRef } from './crypto/envelope';
import type { CloudKeyRing } from './crypto/keys';
import { encodeRecoveryCode, decodeRecoveryCode } from './crypto/recoveryCode';
import { saveDeviceKeyRing, forgetDeviceKeyRing } from './crypto/keyStore';

/** The single escrow row id and the initial key epoch. */
const ESCROW_ID = 'v1';
const EPOCH = 1;

type Row = Record<string, unknown>;

const pkOf = (db: LoremDB, table: string, row: Row): string =>
  String(row[db.table(table).schema.primKey.keyPath as string]);

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
 * Provision cloud encryption: mint a master secret, wrap it under the passphrase
 * for escrow, derive and store the device key ring, seal existing rows, and
 * return the one-time recovery code for the UI to show once.
 */
export const createCloudEncryption = async (
  passphrase: string,
  db: LoremDB = appDb,
): Promise<string> => {
  const master = generateMasterSecret();
  const iterations = await calibrateIterations();
  const escrow = await wrapMasterSecret(master, passphrase, iterations);
  await db.cloudCrypto.put(escrow);
  await saveDeviceKeyRing(await deriveKeyRing(master, escrow.epoch));
  await sealExistingRows(db);
  return encodeRecoveryCode(master);
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
  invariant(escrow, 'no cloud escrow to unlock on this database');
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

/** Forget the device's key ring only; the escrow and other devices are untouched. */
export const forgetThisDevice = async (): Promise<void> => {
  await forgetDeviceKeyRing();
};

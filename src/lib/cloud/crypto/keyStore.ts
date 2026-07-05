import Dexie, { type Table } from 'dexie';
import type { CloudKeyRing, EscrowRecord } from './keys';

/**
 * Device persistence of the derived, non-extractable key ring. Kept in its own
 * dedicated Dexie database (never the synced app db, never localStorage) so the
 * `CryptoKey`s ride IndexedDB's structured clone and never exist as raw/JWK
 * bytes. A small in-memory cache backs {@link deviceKeyProvider}, which the
 * encryption middleware polls synchronously.
 *
 * The same database also holds the *pending escrow*: the passphrase-wrapped
 * master minted at setup, kept here (never synced) until reconciliation confirms
 * the account has none and publishes it. Holding it back is what makes escrow
 * publication add-only — the sync queue can never race a local escrow over the
 * server's.
 */
interface KeyRingRow {
  id: string;
  ring: CloudKeyRing;
}

interface EscrowRow {
  id: string;
  escrow: EscrowRecord;
}

class KeystoreDb extends Dexie {
  rings!: Table<KeyRingRow, string>;
  pendingEscrows!: Table<EscrowRow, string>;
  constructor() {
    super('lipsum-cloud-keystore');
    this.version(1).stores({ rings: 'id' });
    this.version(2).stores({ rings: 'id', pendingEscrows: 'id' });
  }
}

const DEVICE = 'device';
let keystore: KeystoreDb | null = null;
let cached: CloudKeyRing | null = null;

const db = (): KeystoreDb => (keystore ??= new KeystoreDb());

export const saveDeviceKeyRing = async (ring: CloudKeyRing): Promise<void> => {
  await db().rings.put({ id: DEVICE, ring });
  cached = ring;
};

export const loadDeviceKeyRing = async (): Promise<CloudKeyRing | null> => {
  const row = await db().rings.get(DEVICE);
  cached = row?.ring ?? null;
  return cached;
};

export const forgetDeviceKeyRing = async (): Promise<void> => {
  await db().rings.delete(DEVICE);
  cached = null;
};

/** Hold an escrow on the device until reconciliation decides whether to publish it. */
export const savePendingEscrow = async (escrow: EscrowRecord): Promise<void> => {
  await db().pendingEscrows.put({ id: DEVICE, escrow });
};

/** The escrow awaiting publication, if any. */
export const loadPendingEscrow = async (): Promise<EscrowRecord | null> => {
  const row = await db().pendingEscrows.get(DEVICE);
  return row?.escrow ?? null;
};

/** Drop the pending escrow (once published, or superseded by adoption). */
export const clearPendingEscrow = async (): Promise<void> => {
  await db().pendingEscrows.delete(DEVICE);
};

/**
 * A synchronous view of the current key ring for the DBCore middleware: `null`
 * until a ring is loaded or unlocked (the middleware's keyless pass-through
 * covers that gap).
 */
export const deviceKeyProvider = {
  current: (): CloudKeyRing | null => cached,
};

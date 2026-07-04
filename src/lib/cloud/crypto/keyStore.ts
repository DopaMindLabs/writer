import Dexie, { type Table } from 'dexie';
import type { CloudKeyRing } from './keys';

/**
 * Device persistence of the derived, non-extractable key ring. Kept in its own
 * dedicated Dexie database (never the synced app db, never localStorage) so the
 * `CryptoKey`s ride IndexedDB's structured clone and never exist as raw/JWK
 * bytes. A small in-memory cache backs {@link deviceKeyProvider}, which the
 * encryption middleware polls synchronously.
 */
interface KeyRingRow {
  id: string;
  ring: CloudKeyRing;
}

class KeystoreDb extends Dexie {
  rings!: Table<KeyRingRow, string>;
  constructor() {
    super('lipsum-cloud-keystore');
    this.version(1).stores({ rings: 'id' });
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

/**
 * A synchronous view of the current key ring for the DBCore middleware: `null`
 * until a ring is loaded or unlocked (the middleware's keyless pass-through
 * covers that gap).
 */
export const deviceKeyProvider = {
  current: (): CloudKeyRing | null => cached,
};

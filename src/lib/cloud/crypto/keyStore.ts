import Dexie, { type Table } from 'dexie';
import type { CloudKeyRing, EscrowRecord } from './keys';
import { broadcastKeyRingChange } from './keyRingChannel';

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

interface KeystoreService {
  getDeviceKeyRevision: () => number;
  onDeviceKeyRingChange: (listener: () => void) => () => void;
  saveDeviceKeyRing: (ring: CloudKeyRing) => Promise<void>;
  loadDeviceKeyRing: () => Promise<CloudKeyRing | null>;
  forgetDeviceKeyRing: () => Promise<void>;
  savePendingEscrow: (escrow: EscrowRecord) => Promise<void>;
  loadPendingEscrow: () => Promise<EscrowRecord | null>;
  clearPendingEscrow: () => Promise<void>;
  currentRing: () => CloudKeyRing | null;
}

/**
 * Own all mutable keystore state in one service instance instead of module-level
 * `let`s: the lazily-opened database, the cached ring, the change listeners, and
 * the revision counter live in this closure. A single `const` service is created
 * below, so the module exposes only stable functions and never module-level
 * mutable bindings.
 *
 * The revision counter is bumped on every cache transition (acquire, reload,
 * forget). Acquiring a key changes no IndexedDB *content* row, so `useLiveQuery`
 * would not re-run and a keyless device's hidden rows would stay hidden until
 * reload. Cloud-aware live queries fold this number into their dependency array,
 * so a bump forces every encrypted read to re-evaluate the moment the key
 * becomes available.
 */
const createKeystoreService = (): KeystoreService => {
  let keystore: KeystoreDb | null = null;
  let cached: CloudKeyRing | null = null;
  let deviceKeyRevision = 0;
  const ringListeners = new Set<() => void>();

  const db = (): KeystoreDb => (keystore ??= new KeystoreDb());

  const notifyRingChange = (): void => {
    deviceKeyRevision += 1;
    for (const listener of ringListeners) listener();
  };

  return {
    getDeviceKeyRevision: () => deviceKeyRevision,
    onDeviceKeyRingChange: (listener) => {
      ringListeners.add(listener);
      return () => {
        ringListeners.delete(listener);
      };
    },
    saveDeviceKeyRing: async (ring) => {
      await db().rings.put({ id: DEVICE, ring });
      cached = ring;
      notifyRingChange();
      // Tell sibling tabs to reload from the shared keystore now the commit landed.
      broadcastKeyRingChange('changed');
    },
    loadDeviceKeyRing: async () => {
      const row = await db().rings.get(DEVICE);
      cached = row?.ring ?? null;
      notifyRingChange();
      return cached;
    },
    forgetDeviceKeyRing: async () => {
      await db().rings.delete(DEVICE);
      cached = null;
      notifyRingChange();
      broadcastKeyRingChange('forgotten');
    },
    savePendingEscrow: async (escrow) => {
      await db().pendingEscrows.put({ id: DEVICE, escrow });
    },
    loadPendingEscrow: async () => {
      const row = await db().pendingEscrows.get(DEVICE);
      return row?.escrow ?? null;
    },
    clearPendingEscrow: async () => {
      await db().pendingEscrows.delete(DEVICE);
    },
    currentRing: () => cached,
  };
};

const keystoreService = createKeystoreService();

/** The current device-key-ring revision; increments on acquire/reload/forget. */
export const getDeviceKeyRevision = (): number =>
  keystoreService.getDeviceKeyRevision();

/**
 * Subscribe to changes of the cached device key ring (acquired or forgotten).
 * Lets the keyless-lock monitor recompute without polling, and drives the
 * key-revision store that re-runs encrypted live queries. Returns an unsubscribe.
 */
export const onDeviceKeyRingChange = (listener: () => void): (() => void) =>
  keystoreService.onDeviceKeyRingChange(listener);

export const saveDeviceKeyRing = (ring: CloudKeyRing): Promise<void> =>
  keystoreService.saveDeviceKeyRing(ring);

export const loadDeviceKeyRing = (): Promise<CloudKeyRing | null> =>
  keystoreService.loadDeviceKeyRing();

export const forgetDeviceKeyRing = (): Promise<void> =>
  keystoreService.forgetDeviceKeyRing();

/** Hold an escrow on the device until reconciliation decides whether to publish it. */
export const savePendingEscrow = (escrow: EscrowRecord): Promise<void> =>
  keystoreService.savePendingEscrow(escrow);

/** The escrow awaiting publication, if any. */
export const loadPendingEscrow = (): Promise<EscrowRecord | null> =>
  keystoreService.loadPendingEscrow();

/** Drop the pending escrow (once published, or superseded by adoption). */
export const clearPendingEscrow = (): Promise<void> =>
  keystoreService.clearPendingEscrow();

/**
 * A synchronous view of the current key ring for the DBCore middleware: `null`
 * until a ring is loaded or unlocked (the middleware's keyless pass-through
 * covers that gap).
 */
export const deviceKeyProvider = {
  current: (): CloudKeyRing | null => keystoreService.currentRing(),
};

import Dexie, { type Table } from 'dexie';
import { invariant } from '@/lib/invariant';
import type { ScopeKeyContext } from '@/lib/writerSync/crypto/keyResolver';
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
 *
 * Both records carry an explicit `accountId` binding. `null` means the material
 * was created before sign-in and has not been claimed; a string means it is
 * usable only while signed into that `UserLogin.userId`. Key material minted for
 * account A must never seal or publish account B's content — the binding is how
 * reconciliation and the identity-change guard tell the two apart.
 */

/** A device key ring together with the account it is bound to. */
export interface DeviceKeyRingRecord {
  accountId: string | null;
  ring: CloudKeyRing;
}

/** A held-back escrow together with the account it is bound to. */
export interface PendingEscrowRecord {
  accountId: string | null;
  escrow: EscrowRecord;
}

interface KeyRingRow extends DeviceKeyRingRecord {
  id: string;
}

interface EscrowRow extends PendingEscrowRecord {
  id: string;
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

/**
 * Validate the `accountId` binding read back from a stored row. A missing or
 * malformed binding is invalid greenfield data — reject it rather than silently
 * repairing it to a value that might let account A's material act for account B.
 */
const requireAccountId = (value: unknown, kind: string): string | null => {
  invariant(
    value === null || typeof value === 'string',
    `keystore ${kind} row has a missing or malformed accountId`,
  );
  return value;
};

/** Map a stored ring row to a validated in-memory record (or `null` if absent). */
const toRingRecord = (row: KeyRingRow | undefined): DeviceKeyRingRecord | null =>
  row ? { accountId: requireAccountId(row.accountId, 'ring'), ring: row.ring } : null;

/** Map a stored escrow row to a validated record (or `null` if absent). */
const toEscrowRecord = (row: EscrowRow | undefined): PendingEscrowRecord | null =>
  row
    ? { accountId: requireAccountId(row.accountId, 'pending escrow'), escrow: row.escrow }
    : null;

interface KeystoreService {
  getDeviceKeyRevision: () => number;
  onDeviceKeyRingChange: (listener: () => void) => () => void;
  saveDeviceKeyRing: (record: DeviceKeyRingRecord) => Promise<void>;
  loadDeviceKeyRing: () => Promise<CloudKeyRing | null>;
  bindDeviceKeyRing: (accountId: string) => Promise<void>;
  forgetDeviceKeyRing: () => Promise<void>;
  invalidateCachedRing: () => void;
  savePendingEscrow: (record: PendingEscrowRecord) => Promise<void>;
  loadPendingEscrow: () => Promise<PendingEscrowRecord | null>;
  clearPendingEscrow: () => Promise<void>;
  currentRing: () => CloudKeyRing | null;
  currentAccountId: () => string | null;
}

/**
 * Own all mutable keystore state in one service instance instead of module-level
 * `let`s: the lazily-opened database, the cached record, the change listeners,
 * and the revision counter live in this closure. A single `const` service is
 * created below, so the module exposes only stable functions and never
 * module-level mutable bindings.
 *
 * The revision counter is bumped on every cache transition (acquire, reload,
 * forget, invalidate). Acquiring a key changes no IndexedDB *content* row, so
 * `useLiveQuery` would not re-run and a keyless device's hidden rows would stay
 * hidden until reload. Cloud-aware live queries fold this number into their
 * dependency array, so a bump forces every encrypted read to re-evaluate the
 * moment the key becomes available.
 */
const createKeystoreService = (): KeystoreService => {
  let keystore: KeystoreDb | null = null;
  let cached: DeviceKeyRingRecord | null = null;
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
    saveDeviceKeyRing: async ({ accountId, ring }) => {
      await db().rings.put({ id: DEVICE, accountId, ring });
      cached = { accountId, ring };
      notifyRingChange();
      broadcastKeyRingChange('changed');
    },
    loadDeviceKeyRing: async () => {
      cached = toRingRecord(await db().rings.get(DEVICE));
      notifyRingChange();
      return cached?.ring ?? null;
    },
    bindDeviceKeyRing: async (accountId) => {
      if (cached?.accountId !== null) return;
      await db().rings.update(DEVICE, { accountId });
      cached = { accountId, ring: cached.ring };
    },
    forgetDeviceKeyRing: async () => {
      await db().rings.delete(DEVICE);
      cached = null;
      notifyRingChange();
      broadcastKeyRingChange('forgotten');
    },
    invalidateCachedRing: () => {
      if (cached === null) return;
      cached = null;
      notifyRingChange();
    },
    savePendingEscrow: async ({ accountId, escrow }) => {
      await db().pendingEscrows.put({ id: DEVICE, accountId, escrow });
    },
    loadPendingEscrow: async () =>
      toEscrowRecord(await db().pendingEscrows.get(DEVICE)),
    clearPendingEscrow: async () => {
      await db().pendingEscrows.delete(DEVICE);
    },
    currentRing: () => cached?.ring ?? null,
    currentAccountId: () => cached?.accountId ?? null,
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

/** Persist and cache the device key ring bound to an account (`null` = pre-sign-in). */
export const saveDeviceKeyRing = (record: DeviceKeyRingRecord): Promise<void> =>
  keystoreService.saveDeviceKeyRing(record);

export const loadDeviceKeyRing = (): Promise<CloudKeyRing | null> =>
  keystoreService.loadDeviceKeyRing();

/**
 * Claim an as-yet-unbound cached ring for the given account, persisting the
 * binding. Only ever moves the binding from `null` to a concrete account — a ring
 * already bound to a different account is never rebound here, since the
 * identity-change guard forgets such material before it can reach this path.
 *
 * @param accountId - the `UserLogin.userId` to bind the current ring to.
 */
export const bindDeviceKeyRing = (accountId: string): Promise<void> =>
  keystoreService.bindDeviceKeyRing(accountId);

export const forgetDeviceKeyRing = (): Promise<void> =>
  keystoreService.forgetDeviceKeyRing();

/**
 * Synchronously drop the cached ring so the keyless-lock monitor engages the
 * write lock at once — before the async persistent forget lands. Does not delete
 * the stored row or broadcast to siblings; the persistent forget that follows is
 * what they react to.
 */
export const invalidateCachedRing = (): void => {
  keystoreService.invalidateCachedRing();
};

/** Hold an escrow on the device until reconciliation decides whether to publish it. */
export const savePendingEscrow = (record: PendingEscrowRecord): Promise<void> =>
  keystoreService.savePendingEscrow(record);

/** The escrow awaiting publication with its account binding, if any. */
export const loadPendingEscrow = (): Promise<PendingEscrowRecord | null> =>
  keystoreService.loadPendingEscrow();

/** Drop the pending escrow (once published, or superseded by adoption). */
export const clearPendingEscrow = (): Promise<void> =>
  keystoreService.clearPendingEscrow();

/**
 * A synchronous view of the current key ring: `null` until a ring is loaded or
 * unlocked (the middleware's keyless pass-through covers that gap). `accountId`
 * exposes the cached ring's binding synchronously, so the identity-change guard
 * can compare it the instant sign-in changes.
 *
 * `keyFor` makes this the Stage 1 `ScopeKeyResolver`: it receives the full
 * per-row context (access scope, table, primary key, operation) but resolves
 * every scope to the one account content key. Per-scope keys are a change to
 * this resolution — never another middleware API change.
 */
export const deviceKeyProvider = {
  current: (): CloudKeyRing | null => keystoreService.currentRing(),
  accountId: (): string | null => keystoreService.currentAccountId(),
  keyFor: (context: ScopeKeyContext): CloudKeyRing | null => {
    // Stage 1: every scope resolves to the one account content key. The context
    // is accepted (and exercised by the middleware tests) so per-scope keys are
    // a change to this body alone.
    void context;
    return keystoreService.currentRing();
  },
  hasAnyKey: (): boolean => keystoreService.currentRing() !== null,
};

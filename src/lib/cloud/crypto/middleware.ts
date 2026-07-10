import Dexie, {
  type DBCore,
  type DBCoreTable,
  type DBCoreMutateRequest,
  type DBCoreGetRequest,
  type DBCoreGetManyRequest,
  type DBCoreQueryRequest,
  type Middleware,
} from 'dexie';
import type { CloudKeyRing } from './keys';
import { isEncryptedTable, plaintextFieldsFor, CIPHER_FIELD } from './tableRules';
import { sealRow, openRow, EnvelopeIntegrityError } from './envelope';
import { CloudKeyMismatchError, CloudKeylessWriteError } from './errors';
import { keyMismatchState } from './keyMismatch';
import { currentLockReason, type LockReason } from './lockReason';

/**
 * A synchronous view of the active key ring for the encryption middleware.
 * `null` means "no key yet" — the middleware then passes rows through untouched
 * so the app keeps working before setup and the sync engine ships ciphertext
 * verbatim.
 */
export interface KeyProvider {
  current(): CloudKeyRing | null;
}

type Row = Record<string, unknown>;

/** The stored primary key of a row, as a string for the envelope's row binding. */
const pkString = (table: DBCoreTable, value: Row, fallback?: unknown): string => {
  const extract = table.schema.primaryKey.extractKey;
  return String(extract ? extract(value) : fallback);
};

/** Seal every value in an add/put request; other mutations pass through. */
const sealMutate = async (
  table: DBCoreTable,
  ring: CloudKeyRing,
  req: DBCoreMutateRequest,
): Promise<DBCoreMutateRequest> => {
  if (req.type !== 'add' && req.type !== 'put') return req;
  const rules = plaintextFieldsFor(table.name);
  const rows = req.values as readonly Row[];
  const values = await Promise.all(
    rows.map((value, i) =>
      sealRow(ring, { table: table.name, primaryKey: pkString(table, value, req.keys?.[i]) }, value, rules),
    ),
  );
  return { ...req, values };
};

/**
 * Open a row, or drop it (returning `undefined`) when it cannot be decrypted
 * with the current key. A decrypt failure means the row was sealed under a key
 * this device does not hold — a key mismatch — so flag it, engaging the conflict
 * banner and the write lock. Crucially it never throws: a read that crashed the
 * whole route to the recovery screen would trap the user there, unable to reach
 * the settings surface that resolves the conflict. Non-integrity errors still
 * propagate.
 */
const openOrDrop = async (
  table: DBCoreTable,
  ring: CloudKeyRing,
  value: Row | undefined,
  onUnreadable: () => void,
): Promise<Row | undefined> => {
  if (!value) return value;
  try {
    return await openRow(
      ring,
      { table: table.name, primaryKey: pkString(table, value) },
      value,
    );
  } catch (error) {
    if (error instanceof EnvelopeIntegrityError) {
      onUnreadable();
      return undefined;
    }
    throw error;
  }
};

/**
 * Web Crypto is asynchronous, but Dexie commits a transaction the moment control
 * returns to the event loop on a non-Dexie promise. {@link Dexie.waitFor} keeps
 * the surrounding transaction alive — but only if it is called *before* control
 * returns to the event loop even once. It must therefore wrap the native
 * read itself, not just the decrypt that follows an `await` of it: awaiting the
 * native call first and calling {@link Dexie.waitFor} only afterwards is one
 * tick too late — real IndexedDB can auto-commit the transaction in that gap
 * (fake-indexeddb, used in this file's test suite, does not reproduce the
 * timing tightly enough to catch this; it must be verified in a real browser).
 * Outside a transaction this degrades to a plain await, so every call site is
 * safe either way.
 */
const inTx = <T,>(work: Promise<T>): Promise<T> => Dexie.waitFor(work);

const openMany = (
  table: DBCoreTable,
  ring: CloudKeyRing,
  values: readonly unknown[],
  onUnreadable: () => void,
): Promise<(Row | undefined)[]> =>
  Promise.all(
    values.map((v) => openOrDrop(table, ring, v as Row | undefined, onUnreadable)),
  );

/**
 * Wrap the value-returning read/write ops of an encrypted table.
 *
 * `openCursor` is deliberately *not* wrapped: Web Crypto is asynchronous, but
 * Dexie reads `cursor.value` synchronously during iteration and `.modify()`
 * needs to read and write inside a single live IndexedDB transaction — an
 * `await` for a decrypt would break both. Cursor-driven reads (`.filter()`,
 * `.each()`) and `.modify()` on encrypted tables must therefore go through the
 * key/query paths instead (read via `get`/`toArray`, then write explicitly);
 * callers are adapted where the encrypted database is constructed.
 */
/** Whether a stored row carries a ciphertext envelope (was sealed under a key). */
const isSealed = (value: Row | undefined): boolean =>
  value?.[CIPHER_FIELD] !== undefined;

/** Keyless single read: drop a sealed row (unreadable) when hiding, else pass through. */
const keylessGet = async (
  read: Promise<unknown>,
  hide: boolean,
): Promise<unknown> => {
  const row = (await read) as Row | undefined;
  return hide && isSealed(row) ? undefined : row;
};

/** Keyless batch read: replace sealed rows with undefined when hiding. */
const keylessGetMany = async (
  read: Promise<unknown[]>,
  hide: boolean,
): Promise<unknown[]> => {
  const rows = await read;
  if (!hide) return rows;
  return rows.map((row) => (isSealed(row as Row | undefined) ? undefined : row));
};

/** Keyless list read: omit sealed rows when hiding. */
const keylessQuery = async (
  read: Promise<{ result: unknown[] }>,
  hide: boolean,
): Promise<{ result: unknown[] }> => {
  const res = await read;
  if (!hide) return res;
  return { ...res, result: res.result.filter((row) => !isSealed(row as Row | undefined)) };
};

const wrapTable = (
  table: DBCoreTable,
  provider: KeyProvider,
  lockReason: () => LockReason,
  flagMismatch: () => void,
): DBCoreTable => {
  if (!isEncryptedTable(table.name)) return table;
  // A signed-in-but-keyless device hides sealed rows on read (it cannot open
  // them yet) so the UI never renders undefined fields; a plain keyless device
  // (pre-setup, signed out) still passes rows through untouched.
  const hideSealed = () => lockReason() === 'keyless';
  return {
    ...table,
    mutate: async (req: DBCoreMutateRequest) => {
      // Refuse content add/put while locked: under a mismatch the account holds a
      // different key (a push would pollute it); while signed-in-keyless there is
      // no key to seal with (a push would leak plaintext). Deletes still pass, so
      // the mismatch escape hatch can drop unreadable rows.
      const reason = lockReason();
      if (reason !== 'none' && (req.type === 'add' || req.type === 'put')) {
        throw reason === 'mismatch'
          ? new CloudKeyMismatchError()
          : new CloudKeylessWriteError();
      }
      const ring = provider.current();
      return table.mutate(ring ? await inTx(sealMutate(table, ring, req)) : req);
    },
    get: (req: DBCoreGetRequest) => {
      const ring = provider.current();
      if (!ring) return keylessGet(table.get(req), hideSealed());
      return inTx(
        (async () =>
          openOrDrop(table, ring, (await table.get(req)) as Row | undefined, flagMismatch))(),
      );
    },
    getMany: (req: DBCoreGetManyRequest) => {
      const ring = provider.current();
      if (!ring) return keylessGetMany(table.getMany(req), hideSealed());
      return inTx(
        (async () => openMany(table, ring, await table.getMany(req), flagMismatch))(),
      );
    },
    query: (req: DBCoreQueryRequest) => {
      const ring = provider.current();
      if (req.values === false) return table.query(req);
      if (!ring) return keylessQuery(table.query(req), hideSealed());
      return inTx(
        (async () => {
          const res = await table.query(req);
          const opened = await openMany(table, ring, res.result, flagMismatch);
          // Unreadable rows are dropped rather than crashing the read; the list
          // just omits them until the mismatch is resolved.
          return { ...res, result: opened.filter((row): row is Row => row !== undefined) };
        })(),
      );
    },
  };
};

/**
 * DBCore middleware that field-encrypts synced content tables. It sits above the
 * cloud addon (higher `level`) so the addon only ever sees ciphertext: writes
 * are sealed before they reach the sync queue, reads are opened after.
 */
export const createEncryptionMiddleware = (
  provider: KeyProvider,
  lockReason: () => LockReason = currentLockReason,
  flagMismatch: () => void = () => {
    keyMismatchState.set(true);
  },
): Middleware<DBCore> => ({
  stack: 'dbcore',
  name: 'lipsumEncryption',
  level: 10,
  create: (down: DBCore) => ({
    ...down,
    table: (name: string) => wrapTable(down.table(name), provider, lockReason, flagMismatch),
  }),
});

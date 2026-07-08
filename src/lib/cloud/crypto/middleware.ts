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
import { isEncryptedTable, plaintextFieldsFor } from './tableRules';
import { sealRow, openRow, EnvelopeIntegrityError } from './envelope';
import { CloudKeyMismatchError } from './errors';
import { keyMismatchState } from './keyMismatch';

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
const wrapTable = (
  table: DBCoreTable,
  provider: KeyProvider,
  isLocked: () => boolean,
  flagMismatch: () => void,
): DBCoreTable => {
  if (!isEncryptedTable(table.name)) return table;
  return {
    ...table,
    mutate: async (req: DBCoreMutateRequest) => {
      // Under a detected key mismatch the account is protected by a key this
      // device does not hold. Refuse to seal and queue new content — a push
      // would pollute the account with rows under the wrong key. Deletes still
      // pass, so the mismatch escape hatch can drop unreadable rows.
      if (isLocked() && (req.type === 'add' || req.type === 'put')) {
        throw new CloudKeyMismatchError();
      }
      const ring = provider.current();
      return table.mutate(ring ? await inTx(sealMutate(table, ring, req)) : req);
    },
    get: (req: DBCoreGetRequest) => {
      const ring = provider.current();
      if (!ring) return table.get(req);
      return inTx(
        (async () =>
          openOrDrop(table, ring, (await table.get(req)) as Row | undefined, flagMismatch))(),
      );
    },
    getMany: (req: DBCoreGetManyRequest) => {
      const ring = provider.current();
      if (!ring) return table.getMany(req);
      return inTx(
        (async () => openMany(table, ring, await table.getMany(req), flagMismatch))(),
      );
    },
    query: (req: DBCoreQueryRequest) => {
      const ring = provider.current();
      if (!ring || req.values === false) return table.query(req);
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
  isLocked: () => boolean = () => keyMismatchState.current(),
  flagMismatch: () => void = () => {
    keyMismatchState.set(true);
  },
): Middleware<DBCore> => ({
  stack: 'dbcore',
  name: 'lipsumEncryption',
  level: 10,
  create: (down: DBCore) => ({
    ...down,
    table: (name: string) => wrapTable(down.table(name), provider, isLocked, flagMismatch),
  }),
});

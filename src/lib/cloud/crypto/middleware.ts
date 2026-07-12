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
import { sealRow, openRow, EnvelopeIntegrityError, MalformedEnvelopeError } from './envelope';
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

/**
 * Whether a mutation is the cloud addon applying rows it just pulled from the
 * server, rather than an app write. The addon runs `applyServerChanges` (and its
 * WebSocket equivalent) inside a transaction it marks `disableChangeTracking` —
 * the same flag it reads back off `req.trans` to skip its own change queue. Those
 * rows are ciphertext the addon pulled, so they must pass the write lock even
 * while the device is keyless or mismatched: blocking them aborts the initial
 * pull, so `initiallySynced` is never set and setup deadlocks on "fetching your
 * account…". A safe read of an addon-set flag, not a validation bypass.
 */
const isSyncApplied = (trans: DBCoreMutateRequest['trans']): boolean =>
  (trans as { disableChangeTracking?: boolean }).disableChangeTracking === true;

/** The stored primary key of a row, as a string for the envelope's row binding. */
const pkString = (table: DBCoreTable, value: Row, fallback?: unknown): string => {
  const extract = table.schema.primaryKey.extractKey;
  return String(extract ? extract(value) : fallback);
};

/**
 * Strip the plaintext update descriptors off a put request. `Table.update()` /
 * `Collection.modify()` attach the raw changes as `criteria` + `changeSpec`
 * (and `Table.upsert()` as `updates`) alongside the full row values. The cloud
 * addon sits *below* this middleware and prefers those descriptors when logging
 * the mutation — left in place they ship the changed fields to the server in
 * plaintext even though the row values are sealed, and the server then stamps
 * them onto its rows in the clear. Dropping them demotes the operation to a
 * plain full-row upsert of the sealed values, the only shape that cannot leak.
 */
const stripUpdateDescriptors = (req: DBCoreMutateRequest): DBCoreMutateRequest => {
  if (req.type !== 'put') return req;
  if (!('criteria' in req) && !('changeSpec' in req) && !('updates' in req)) return req;
  const stripped = { ...req };
  delete stripped.criteria;
  delete stripped.changeSpec;
  delete stripped.updates;
  return stripped;
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
    // A structurally malformed envelope is corruption, not a key mismatch: drop
    // the row from this read so the list survives, but never flag a mismatch (it
    // would wrongly lock the device). Post-inline-envelope this should not occur.
    if (error instanceof MalformedEnvelopeError) {
      console.error('Dropping a row with a malformed cipher envelope', {
        table: table.name,
      });
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
      // the mismatch escape hatch can drop unreadable rows. A sync-applied write is
      // exempt: it is ciphertext the addon just pulled, and blocking it would abort
      // the initial pull and deadlock setup — reads already hide sealed rows while
      // keyless, and the seal path below preserves an existing envelope untouched.
      const reason = lockReason();
      const appWrite = req.type === 'add' || req.type === 'put';
      if (reason !== 'none' && appWrite && !isSyncApplied(req.trans)) {
        throw reason === 'mismatch'
          ? new CloudKeyMismatchError()
          : new CloudKeylessWriteError();
      }
      const ring = provider.current();
      const safeReq = stripUpdateDescriptors(req);
      return table.mutate(ring ? await inTx(sealMutate(table, ring, safeReq)) : safeReq);
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

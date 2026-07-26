import Dexie, {
  type DBCore,
  type DBCoreTable,
  type DBCoreAddRequest,
  type DBCorePutRequest,
  type DBCoreMutateRequest,
  type DBCoreMutateResponse,
  type DBCoreGetRequest,
  type DBCoreGetManyRequest,
  type DBCoreQueryRequest,
  type Middleware,
} from 'dexie';
import type {
  ScopeKeyContext,
  ScopeKeyResolver,
  SyncKeyRing,
} from '@/lib/writerSync/crypto/keyResolver';
import { isEncryptedTable, plaintextFieldsFor, CIPHER_FIELD } from './tableRules';
import { sealRow, openRow, EnvelopeIntegrityError, MalformedEnvelopeError } from './envelope';
import { CloudKeyMismatchError, CloudKeylessWriteError } from './errors';
import { keyMismatchState } from './keyMismatch';
import { currentLockReason, type LockReason } from './lockReason';

/**
 * Key material reaches the middleware through a {@link ScopeKeyResolver}: every
 * row operation resolves with its full context (access scope, table, primary
 * key, read/write), so scope-specific keys are a resolver change, never another
 * middleware change. `null` from the resolver means "no key for this context" —
 * the middleware then passes plaintext rows through untouched (so the app keeps
 * working before setup) and hides sealed rows (a device without the key must
 * never hand raw ciphertext to a typed consumer).
 */

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

/**
 * Whether a request runs inside the addon's internal blob-plumbing transaction,
 * which it marks `disableBlobResolve` (the same flag the addon's blob-resolve
 * middleware reads to skip itself). Inside it the addon reads a row back to patch
 * a downloaded blob into place and writes it out again — pure ciphertext
 * plumbing. This middleware must stay inert there: decrypting the read would
 * fail (the row still holds an unresolved ref) and return `undefined`, which
 * corrupts the addon's write-back and leaves `_hasBlobRefs` set — an infinite
 * download loop that saturates the main thread. Passing the raw row straight
 * through keeps the plumbing working on the ciphertext it expects.
 */
const isInternalBlobTx = (trans: DBCoreMutateRequest['trans']): boolean =>
  (trans as { disableBlobResolve?: boolean }).disableBlobResolve === true;

/** The stored primary key of a row, as a string for the envelope's row binding. */
const pkString = (table: DBCoreTable, value: Row, fallback?: unknown): string => {
  const extract = table.schema.primaryKey.extractKey;
  return String(extract ? extract(value) : fallback);
};

/** The resolver context for one row. Scope comes from the row's plaintext metadata. */
const contextFor = (options: {
  table: DBCoreTable;
  row: Row;
  fallbackKey: unknown;
  operation: 'read' | 'write';
}): ScopeKeyContext => {
  const scope = options.row.accessScopeId;
  return {
    accessScopeId: typeof scope === 'string' ? scope : '',
    table: options.table.name,
    primaryKey: pkString(options.table, options.row, options.fallbackKey),
    operation: options.operation,
  };
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

/**
 * The per-row key resolutions for an add/put request, computed synchronously so
 * the caller can tell — before any async work — whether sealing is needed at
 * all. A row whose context resolves no key is written as-is (the keyless
 * pre-setup flow).
 */
const resolveWriteRings = (
  table: DBCoreTable,
  resolver: ScopeKeyResolver,
  req: DBCoreAddRequest | DBCorePutRequest,
): { ring: SyncKeyRing | null; primaryKey: string }[] => {
  const rows = req.values as readonly Row[];
  return rows.map((value, i) => {
    const context = contextFor({
      table,
      row: value,
      fallbackKey: req.keys?.[i],
      operation: 'write',
    });
    return { ring: resolver.keyFor(context), primaryKey: context.primaryKey };
  });
};

/** Seal every keyed value in an add/put request using pre-resolved rings. */
const sealMutate = async (
  table: DBCoreTable,
  rings: { ring: SyncKeyRing | null; primaryKey: string }[],
  req: DBCoreAddRequest | DBCorePutRequest,
): Promise<DBCoreMutateRequest> => {
  const rules = plaintextFieldsFor(table.name);
  const rows = req.values as readonly Row[];
  const values = await Promise.all(
    rows.map(async (value, i) => {
      const resolution = rings[i];
      if (!resolution.ring) return value;
      return sealRow(
        resolution.ring,
        { table: table.name, primaryKey: resolution.primaryKey },
        value,
        rules,
      );
    }),
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
  ring: SyncKeyRing,
  value: Row,
  onUnreadable: () => void,
): Promise<Row | undefined> => {
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

/** Whether a stored row carries a ciphertext envelope (was sealed under a key). */
const isSealed = (value: Row | undefined): boolean =>
  value?.[CIPHER_FIELD] !== undefined;

/** Keyless single read: drop a sealed row (no key can open it), pass plaintext. */
const keylessGet = async (read: Promise<unknown>): Promise<unknown> => {
  const row = (await read) as Row | undefined;
  return isSealed(row) ? undefined : row;
};

/** Keyless batch read: replace sealed rows with undefined, preserving positions. */
const keylessGetMany = async (read: Promise<unknown[]>): Promise<unknown[]> => {
  const rows = await read;
  return rows.map((row) => (isSealed(row as Row | undefined) ? undefined : row));
};

/** Keyless list read: omit sealed rows. */
const keylessQuery = async (
  read: Promise<{ result: unknown[] }>,
): Promise<{ result: unknown[] }> => {
  const res = await read;
  return { ...res, result: res.result.filter((row) => !isSealed(row as Row | undefined)) };
};

/**
 * Resolve-and-open a stored row: plaintext rows pass through, sealed rows open
 * under the key their context resolves — or vanish (`undefined`) when no key is
 * available, so a keyless device never hands raw ciphertext to a typed consumer.
 */
const resolveAndOpen = async (options: {
  table: DBCoreTable;
  resolver: ScopeKeyResolver;
  value: Row | undefined;
  onUnreadable: () => void;
}): Promise<Row | undefined> => {
  const { table, resolver, value, onUnreadable } = options;
  if (!value) return value;
  if (!isSealed(value)) return value;
  const ring = resolver.keyFor(
    contextFor({ table, row: value, fallbackKey: undefined, operation: 'read' }),
  );
  if (!ring) return undefined;
  return openOrDrop(table, ring, value, onUnreadable);
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

const openMany = (options: {
  table: DBCoreTable;
  resolver: ScopeKeyResolver;
  values: readonly unknown[];
  onUnreadable: () => void;
}): Promise<(Row | undefined)[]> =>
  Promise.all(
    options.values.map((value) =>
      resolveAndOpen({
        table: options.table,
        resolver: options.resolver,
        value: value as Row | undefined,
        onUnreadable: options.onUnreadable,
      }),
    ),
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
const sealedMutate = async (options: {
  table: DBCoreTable;
  resolver: ScopeKeyResolver;
  lockReason: () => LockReason;
  req: DBCoreMutateRequest;
}): Promise<DBCoreMutateResponse> => {
  const { table, resolver, lockReason, req } = options;
  // Addon blob-plumbing writes the raw ciphertext row back — never reseal it.
  if (isInternalBlobTx(req.trans)) return table.mutate(req);
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
  const safeReq = stripUpdateDescriptors(req);
  if (safeReq.type !== 'add' && safeReq.type !== 'put') return table.mutate(safeReq);
  const rings = resolveWriteRings(table, resolver, safeReq);
  // Keyless fast path: with nothing to seal there must be no async detour at
  // all — `Dexie.waitFor` inside a nested transaction commits it prematurely.
  if (rings.every((resolution) => resolution.ring === null)) {
    return table.mutate(safeReq);
  }
  return table.mutate(await inTx(sealMutate(table, rings, safeReq)));
};

const wrapTable = (
  table: DBCoreTable,
  resolver: ScopeKeyResolver,
  lockReason: () => LockReason,
  flagMismatch: () => void,
): DBCoreTable => {
  if (!isEncryptedTable(table.name)) return table;
  return {
    ...table,
    mutate: (req: DBCoreMutateRequest) =>
      sealedMutate({ table, resolver, lockReason, req }),
    get: (req: DBCoreGetRequest) => {
      // Addon blob-plumbing reads the raw ciphertext row — never decrypt here.
      if (isInternalBlobTx(req.trans)) return table.get(req);
      // Keyless fast path: no decrypt can succeed, so hide sealed rows without
      // the async waitFor detour (which would break nested transactions).
      if (!resolver.hasAnyKey()) return keylessGet(table.get(req));
      return inTx(
        (async () =>
          resolveAndOpen({
            table,
            resolver,
            value: (await table.get(req)) as Row | undefined,
            onUnreadable: flagMismatch,
          }))(),
      );
    },
    getMany: (req: DBCoreGetManyRequest) => {
      if (isInternalBlobTx(req.trans)) return table.getMany(req);
      if (!resolver.hasAnyKey()) return keylessGetMany(table.getMany(req));
      return inTx(
        (async () =>
          openMany({
            table,
            resolver,
            values: await table.getMany(req),
            onUnreadable: flagMismatch,
          }))(),
      );
    },
    query: (req: DBCoreQueryRequest) => {
      if (req.values === false) return table.query(req);
      if (isInternalBlobTx(req.trans)) return table.query(req);
      if (!resolver.hasAnyKey()) return keylessQuery(table.query(req));
      return inTx(
        (async () => {
          const res = await table.query(req);
          const opened = await openMany({
            table,
            resolver,
            values: res.result,
            onUnreadable: flagMismatch,
          });
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
  resolver: ScopeKeyResolver,
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
    table: (name: string) => wrapTable(down.table(name), resolver, lockReason, flagMismatch),
  }),
});

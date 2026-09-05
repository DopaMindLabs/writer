import Dexie, {
  type DBCore,
  type DBCoreAddRequest,
  type DBCoreDeleteRequest,
  type DBCoreMutateRequest,
  type DBCoreMutateResponse,
  type DBCorePutRequest,
  type DBCoreTable,
  type DBCoreTransaction,
  type Middleware,
} from 'dexie';
import type { SyncAttachmentChunk } from '@/db/schema';
import { invariant } from '@/lib/invariant';
import type { DeviceId } from 'writer-sync/core';
import type {
  ScopeKeyResolver,
  SyncKeyRing,
} from 'writer-sync/crypto';
import type { EncryptedSyncFrame } from 'writer-sync/operations';
import {
  chunkedBlobFieldFor,
  journalledTables,
} from '@/lib/writerSyncIntegration/writerTablePolicy';
import {
  isInternalBlobTx,
  isSyncApplied,
} from '@/lib/cloud/crypto/transactionFlags';
import {
  makeDeleteFrame,
  makePutFrame,
  signAuthoredFrames,
} from './writerOperationFactory';
import { isJournalledRow, type UnknownRow } from './journalledRow';
import { prepareFramePayload } from './attachmentFramePayload';
import { tombstoneOf } from './tombstone';

/**
 * DBCore middleware that journals an encrypted operation frame for every
 * synced-content write — the single outbound chokepoint of the operation
 * protocol. Sitting above the row-encryption middleware (higher `level`), it
 * sees each mutation's plaintext rows, prepares frames and attachment chunks
 * before delegating, then commits every store inside the same transaction, so
 * a write and its wire representation can never be torn apart. No call site
 * can forget to journal: coverage holds by construction.
 *
 * Writes it deliberately does **not** journal:
 * - materialisation of inbound frames (their transaction pairs a content table
 *   with `syncInbox`; re-journalling would echo received operations as local);
 * - keyless writes (no scope key resolves — the unlock re-seal via
 *   `sealExistingRows` re-puts those rows and backfills their frames);
 * - the cloud addon's own sync-applied and blob-plumbing transactions;
 * - `deleteRange` (`Table.clear()` is a local reset, never a synced deletion).
 */

type Row = UnknownRow;
const DBCORE_RANGE_BETWEEN = 2;

/**
 * This device's cryptographic identity: the attribution a frame carries and the
 * key that signs it. Resolved together because a signature is only meaningful
 * against the device id it claims — fetching them separately would let the two
 * drift apart.
 */
export interface JournalIdentity {
  deviceId: DeviceId;
  privateKey: CryptoKey;
}

export interface OperationJournalDeps {
  resolver: ScopeKeyResolver;
  /** This device's stable identity; resolved once, then cached. */
  identity: () => Promise<JournalIdentity>;
}

/**
 * Whether the transaction is the materialiser applying an inbound frame. Only
 * `applyInboundFrame` opens a readwrite transaction that spans both a content
 * table and `syncInbox` (asserted by the middleware test suite), so the scope
 * itself is the signal — accurate per transaction even under concurrency.
 */
const isMaterialisationTx = (trans: DBCoreTransaction): boolean =>
  (
    trans as { objectStoreNames?: { contains(name: string): boolean } }
  ).objectStoreNames?.contains('syncInbox') === true;

/** Resolve the write-context ring for one row of `table` (sync, may be null). */
const ringFor = (options: {
  table: DBCoreTable;
  resolver: ScopeKeyResolver;
  row: Row;
  fallbackKey: unknown;
}): SyncKeyRing | null => {
  const { table, resolver, row, fallbackKey } = options;
  const extract = table.schema.primaryKey.extractKey;
  const scope = row.accessScopeId;
  return resolver.keyFor({
    accessScopeId: typeof scope === 'string' ? scope : '',
    table: table.name,
    primaryKey: String(extract ? extract(row) : fallbackKey),
    operation: 'write',
  });
};

/** Append frames to `syncOperations` within the live transaction, if any. */
const writeFrames = async (options: {
  syncOps: DBCoreTable;
  trans: DBCoreTransaction;
  frames: EncryptedSyncFrame[];
}): Promise<void> => {
  if (options.frames.length === 0) return;
  await options.syncOps.mutate({
    type: 'put',
    trans: options.trans,
    values: options.frames,
  });
};

/** Append already-sealed attachment chunks within the live transaction. */
const writeChunks = async (options: {
  syncChunks?: DBCoreTable;
  trans: DBCoreTransaction;
  chunks: SyncAttachmentChunk[];
}): Promise<void> => {
  if (!options.syncChunks || options.chunks.length === 0) return;
  await options.syncChunks.mutate({
    type: 'put',
    trans: options.trans,
    values: options.chunks,
  });
};

/**
 * Record the deletion state the frames just journalled leave behind.
 *
 * A deletion this device made is state, not an event that has passed: it is
 * what a full-state rebuild serves the deletion from once the frame's history
 * has been compacted, and what refuses an older edit arriving from a peer
 * afterwards. Written in the deletion's own transaction, so the row, its frame
 * and its tombstone can never disagree.
 */
const writeTombstones = async (options: {
  syncTombstones: DBCoreTable;
  trans: DBCoreTransaction;
  frames: readonly EncryptedSyncFrame[];
}): Promise<void> => {
  if (options.frames.length === 0) return;
  await options.syncTombstones.mutate({
    type: 'put',
    trans: options.trans,
    values: options.frames.map(tombstoneOf),
  });
};

/** Release the deletion state a row written again has just contradicted. */
const clearTombstones = async (options: {
  syncTombstones: DBCoreTable;
  trans: DBCoreTransaction;
  table: string;
  entityIds: readonly string[];
}): Promise<void> => {
  if (options.entityIds.length === 0) return;
  await options.syncTombstones.mutate({
    type: 'delete',
    trans: options.trans,
    keys: options.entityIds.map((entityId) => [options.table, entityId]),
  });
};

interface PreparedPuts {
  frames: (EncryptedSyncFrame | null)[];
  chunksByRow: SyncAttachmentChunk[][];
}

/**
 * Build one put frame per keyed row, indexed by the row's position in the
 * request so a rejected row's frame can be dropped without re-running crypto.
 */
const putFrames = async (options: {
  table: DBCoreTable;
  rings: (SyncKeyRing | null)[];
  deviceId: DeviceId;
  req: DBCoreAddRequest | DBCorePutRequest;
}): Promise<PreparedPuts> => {
  const { table, rings, deviceId, req } = options;
  const rows = req.values as readonly Row[];
  const frames: (EncryptedSyncFrame | null)[] = [];
  const chunksByRow: SyncAttachmentChunk[][] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const ring = rings[i];
    if (!ring) {
      frames.push(null);
      chunksByRow.push([]);
      continue;
    }
    const row = rows[i];
    invariant(
      isJournalledRow(row),
      () => `operation journal: a ${table.name} row lacks replication metadata`,
    );
    const prepared = await prepareFramePayload({
      entityTable: table.name,
      row,
      ring,
    });
    frames.push(
      await makePutFrame({
        ring,
        deviceId,
        entityTable: table.name,
        row: prepared.row,
      }),
    );
    chunksByRow.push(prepared.chunks);
  }
  return { frames, chunksByRow };
};

/**
 * Frame the stored rows a delete is about to remove. Synchronous: delete frames
 * need no Web Crypto, so nothing suspends the transaction between reading the
 * rows and committing the deletion with its frames.
 */
const deleteFrames = (options: {
  table: DBCoreTable;
  resolver: ScopeKeyResolver;
  deviceId: DeviceId;
  req: DBCoreDeleteRequest;
  rows: (Row | undefined)[];
}): EncryptedSyncFrame[] => {
  const { table, resolver, deviceId, req, rows } = options;
  const frames: EncryptedSyncFrame[] = [];
  for (let i = 0; i < req.keys.length; i += 1) {
    const row = rows[i];
    // A missing key deletes nothing; an unreadable row (sealed under a key this
    // device lacks) opens to undefined — this device must not author frames for
    // content it cannot read, so neither produces a frame.
    if (!row) continue;
    const scope = row.accessScopeId;
    if (typeof scope !== 'string') continue;
    const ring = ringFor({ table, resolver, row, fallbackKey: req.keys[i] });
    if (!ring) continue;
    frames.push(
      makeDeleteFrame({
        ring,
        deviceId,
        entityTable: table.name,
        entityId: String(req.keys[i]),
        accessScopeId: scope,
      }),
    );
  }
  return frames;
};

/**
 * {@link Dexie.waitFor}, wrapping every stretch of non-Dexie asynchronous work
 * (Web Crypto, the vault's device identity) this middleware performs inside a
 * transaction. Two constraints make its placement exact, and both are why the
 * frames are built *before* the domain mutation is delegated downward:
 *
 * 1. **Zone.** Dexie tracks the live transaction in its own promise zone. An
 *    `await` on a native promise leaves that zone, and the hooks middleware
 *    below then reads an undefined current transaction. Only `waitFor` results
 *    and Dexie's own promises may be awaited between DBCore calls, so all
 *    crypto is confined inside a single wrapped promise.
 * 2. **Keep-alive.** `waitFor` spins a keep-alive request only while it is the
 *    outermost wait, and the row-encryption middleware below opens its own wait
 *    when it seals a row. Crypto run *after* delegating downward would
 *    therefore sit outside any keep-alive and the transaction could commit
 *    underneath it.
 *
 * After the frames exist, only IndexedDB requests remain — issued back to back.
 */
const inTx = <T,>(work: Promise<T>): Promise<T> => Dexie.waitFor(work);

/** Journal an add/put: frame every keyed row, then commit write and frames. */
const journalPut = async (options: {
  table: DBCoreTable;
  syncOps: DBCoreTable;
  syncTombstones: DBCoreTable;
  syncChunks?: DBCoreTable;
  resolver: ScopeKeyResolver;
  identity: () => Promise<JournalIdentity>;
  req: DBCoreAddRequest | DBCorePutRequest;
}): Promise<DBCoreMutateResponse> => {
  const { table, syncOps, syncTombstones, syncChunks, resolver, identity, req } = options;
  const rows = req.values as readonly Row[];
  const rings = rows.map((row, i) =>
    ringFor({ table, resolver, row, fallbackKey: req.keys?.[i] }),
  );
  // Keyless rows journal nothing; with no ring at all there must be no async
  // detour either (`Dexie.waitFor` inside a nested transaction commits it
  // prematurely), so the write passes straight through.
  if (rings.every((ring) => ring === null)) return table.mutate(req);
  const prepared = await inTx(
    identity().then(async (device) => {
      const built = await putFrames({
        table,
        rings,
        deviceId: device.deviceId,
        req,
      });
      return {
        ...built,
        frames: await signAuthoredFrames(device.privateKey, built.frames),
      };
    }),
  );
  const response = await table.mutate(req);
  // A row the store rejected (a duplicate `add`) never happened, so its frame is
  // discarded rather than journalled.
  const journalled = prepared.frames.filter(
    (frame, i): frame is EncryptedSyncFrame =>
      frame !== null && !(i in response.failures),
  );
  await writeFrames({ syncOps, trans: req.trans, frames: journalled });
  await clearTombstones({
    syncTombstones,
    trans: req.trans,
    table: table.name,
    entityIds: journalled.map((frame) => frame.entityId),
  });
  await writeChunks({
    syncChunks,
    trans: req.trans,
    chunks: prepared.chunksByRow.flatMap((chunks, index) =>
      index in response.failures ? [] : chunks,
    ),
  });
  return response;
};

/** Delete every stored chunk belonging to one attachment id. */
const deleteChunks = async (options: {
  syncChunks?: DBCoreTable;
  trans: DBCoreTransaction;
  attachmentIds: string[];
}): Promise<void> => {
  if (!options.syncChunks) return;
  for (const attachmentId of options.attachmentIds) {
    await options.syncChunks.mutate({
      type: 'deleteRange',
      trans: options.trans,
      range: {
        type: DBCORE_RANGE_BETWEEN,
        lower: [attachmentId, Dexie.minKey],
        upper: [attachmentId, Dexie.maxKey],
        lowerOpen: false,
        upperOpen: false,
      },
    });
  }
};

/** Journal a delete: frame the stored rows, then commit delete and frames. */
const journalDelete = async (options: {
  table: DBCoreTable;
  syncOps: DBCoreTable;
  syncTombstones: DBCoreTable;
  syncChunks?: DBCoreTable;
  resolver: ScopeKeyResolver;
  identity: () => Promise<JournalIdentity>;
  req: DBCoreDeleteRequest;
}): Promise<DBCoreMutateResponse> => {
  const { table, syncOps, syncTombstones, syncChunks, resolver, identity, req } = options;
  if (!resolver.hasAnyKey()) {
    const response = await table.mutate(req);
    await deleteChunks({
      syncChunks,
      trans: req.trans,
      attachmentIds: req.keys.flatMap((key, index) =>
        index in response.failures ? [] : [String(key)],
      ),
    });
    return response;
  }
  const device = await inTx(identity());
  const rows = (await table.getMany({
    trans: req.trans,
    keys: req.keys,
  })) as (Row | undefined)[];
  // Framing a deletion still needs no Web Crypto; signing one does, so the
  // signature is applied in its own wrapped wait — the same shape `journalPut`
  // uses, and the reason the frames are built before the mutation is delegated.
  const frames = await inTx(
    signAuthoredFrames(
      device.privateKey,
      deleteFrames({ table, resolver, deviceId: device.deviceId, req, rows }),
    ),
  );
  const response = await table.mutate(req);
  await deleteChunks({
    syncChunks,
    trans: req.trans,
    attachmentIds: rows.flatMap((row, index) =>
      row && !(index in response.failures) ? [String(row.id)] : [],
    ),
  });
  await writeFrames({ syncOps, trans: req.trans, frames });
  await writeTombstones({ syncTombstones, trans: req.trans, frames });
  return response;
};

const journalMutate = (options: {
  table: DBCoreTable;
  syncOps: DBCoreTable;
  syncTombstones: DBCoreTable;
  syncChunks?: DBCoreTable;
  deps: OperationJournalDeps;
  identity: () => Promise<JournalIdentity>;
  req: DBCoreMutateRequest;
}): Promise<DBCoreMutateResponse> => {
  const { table, syncOps, syncTombstones, syncChunks, deps, identity, req } = options;
  if (req.type === 'deleteRange') return table.mutate(req);
  if (
    isMaterialisationTx(req.trans) ||
    isSyncApplied(req.trans) ||
    isInternalBlobTx(req.trans)
  ) {
    return table.mutate(req);
  }
  const shared = {
    table,
    syncOps,
    syncTombstones,
    syncChunks,
    resolver: deps.resolver,
    identity,
  };
  if (req.type === 'delete') return journalDelete({ ...shared, req });
  return journalPut({ ...shared, req });
};

/** Whatever the caller asked for, plus every store journalling has to write. */
const withStore = (stores: readonly string[], store: string): string[] =>
  stores.includes(store) ? [...stores] : [...stores, store];

const widenStores = (
  stores: string[],
  journalled: ReadonlySet<string>,
  chunked: ReadonlySet<string>,
): string[] => {
  if (!stores.some((store) => journalled.has(store))) return stores;
  // Deletion state commits with the deletion that produced it, so the scope a
  // journalled write runs in has to reach it.
  const widened = withStore(withStore(stores, 'syncOperations'), 'syncTombstones');
  return stores.some((store) => chunked.has(store))
    ? withStore(widened, 'syncAttachmentChunks')
    : widened;
};

/**
 * Create the operation-journal middleware. Level 20 places it above the
 * row-encryption middleware (level 10), so it frames plaintext rows and its
 * frame writes are sealed/queued by everything below. Its `transaction` wrap
 * widens every readwrite scope that touches a journalled table to include
 * `syncOperations`, so the frame append always has a store to land in.
 */
export const createOperationJournalMiddleware = (
  deps: OperationJournalDeps,
): Middleware<DBCore> => ({
  stack: 'dbcore',
  name: 'lipsumOperationJournal',
  level: 20,
  create: (down: DBCore) => {
    const journalled = new Set(journalledTables());
    const chunked = new Set(
      journalledTables().filter(
        (table) => chunkedBlobFieldFor(table) !== undefined,
      ),
    );
    let device: JournalIdentity | null = null;
    const identity = async (): Promise<JournalIdentity> =>
      (device ??= await deps.identity());
    return {
      ...down,
      transaction: (stores, mode, options) =>
        down.transaction(
          mode === 'readwrite'
            ? widenStores(stores, journalled, chunked)
            : stores,
          mode,
          options,
        ),
      table: (name: string) => {
        const table = down.table(name);
        if (!journalled.has(name)) return table;
        return {
          ...table,
          mutate: (req: DBCoreMutateRequest) =>
            journalMutate({
              table,
              syncOps: down.table('syncOperations'),
              syncTombstones: down.table('syncTombstones'),
              syncChunks: chunked.has(name)
                ? down.table('syncAttachmentChunks')
                : undefined,
              deps,
              identity,
              req,
            }),
        };
      },
    };
  },
});

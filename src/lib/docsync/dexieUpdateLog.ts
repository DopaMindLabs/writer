import { db } from '@/db/db';
import type { DocSyncUpdateRow } from '@/db/schema';
import { invariant } from '@/lib/invariant';
import type {
  StoredUpdate,
  UpdateLog,
  UpdateLogCompaction,
  UpdateLogState,
} from './ports';

const readEpoch = async (docId: string): Promise<number> => {
  const meta = await db.docSyncMeta.get(docId);
  if (!meta) return 0;
  invariant(
    Number.isInteger(meta.epoch) && meta.epoch >= 0,
    () => `doc sync meta for ${docId} holds an invalid epoch`,
  );
  return meta.epoch;
};

// IndexedDB's structured clone can hand back a typed array from another
// realm, where `instanceof Uint8Array` is false; check by tag and re-wrap.
const asUpdateBytes = (value: unknown): Uint8Array | null => {
  if (!ArrayBuffer.isView(value)) return null;
  if (Object.prototype.toString.call(value) !== '[object Uint8Array]') {
    return null;
  }
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
};

const toStoredUpdate = (row: DocSyncUpdateRow): StoredUpdate => {
  invariant(
    typeof row.seq === 'number',
    'doc sync update row is missing its sequence number',
  );
  invariant(
    Number.isInteger(row.epoch) && row.epoch >= 0,
    () => `doc sync update ${String(row.seq)} holds an invalid epoch`,
  );
  const update = asUpdateBytes(row.update);
  invariant(
    update !== null && update.byteLength > 0,
    () => `doc sync update ${String(row.seq)} holds an invalid payload`,
  );
  return { id: row.seq, epoch: row.epoch, update };
};

const load = async (docId: string): Promise<UpdateLogState> =>
  db.transaction('rw', db.docSyncUpdates, db.docSyncMeta, async () => {
    const epoch = await readEpoch(docId);
    const rows = await db.docSyncUpdates
      .where('docId')
      .equals(docId)
      .sortBy('seq');
    const stored = rows.map(toStoredUpdate);
    const stale = stored.filter((u) => u.epoch !== epoch);
    if (stale.length > 0) {
      await db.docSyncUpdates.bulkDelete(stale.map((u) => u.id));
    }
    return { epoch, updates: stored.filter((u) => u.epoch === epoch) };
  });

const append = async (
  docId: string,
  epoch: number,
  update: Uint8Array,
): Promise<void> => {
  await db.docSyncUpdates.add({ docId, epoch, update, createdAt: Date.now() });
};

const compact = async (
  docId: string,
  { epoch, snapshot, replaces }: UpdateLogCompaction,
): Promise<void> => {
  await db.transaction('rw', db.docSyncUpdates, async () => {
    await db.docSyncUpdates.bulkDelete([...replaces]);
    await db.docSyncUpdates.add({
      docId,
      epoch,
      update: snapshot,
      createdAt: Date.now(),
    });
  });
};

const invalidate = async (docId: string): Promise<void> => {
  await db.transaction('rw', db.docSyncUpdates, db.docSyncMeta, async () => {
    const epoch = await readEpoch(docId);
    await db.docSyncMeta.put({ docId, epoch: epoch + 1 });
    await db.docSyncUpdates.where('docId').equals(docId).delete();
  });
};

const deleteAll = async (docIds: readonly string[]): Promise<void> => {
  if (docIds.length === 0) return;
  await db.transaction('rw', db.docSyncUpdates, db.docSyncMeta, async () => {
    await db.docSyncUpdates.where('docId').anyOf([...docIds]).delete();
    await db.docSyncMeta.bulkDelete([...docIds]);
  });
};

/** `UpdateLog` adapter persisting into the app's existing Dexie database. */
export const dexieUpdateLog: UpdateLog = {
  load,
  append,
  compact,
  invalidate,
  deleteAll,
};

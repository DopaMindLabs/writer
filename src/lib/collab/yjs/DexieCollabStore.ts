import Dexie from 'dexie';
import * as Y from 'yjs';
import { db } from '@/db/db';
import type { CollabStore } from '@/lib/collab/types';
import { collabSeedKey } from '@/lib/collab/seedKey';

/**
 * Dexie-backed {@link CollabStore}: a document's CRDT history is an append-only
 * log of `docUpdates` rows, compacted in place once it grows past a threshold.
 *
 * It lives inside the `yjs/` boundary because {@link compactDoc} merges updates
 * with `Y.mergeUpdates`, which is engine-specific — but it implements the
 * engine-agnostic {@link CollabStore} interface so callers stay decoupled. Each
 * operation is a module-level function so the factory stays a thin assembly.
 */

// The log is compacted once it grows past this many rows. Overridable at build
// time (the e2e build lowers it) so the merge path is reachable in tests; the
// production default is 200.
const COMPACT_THRESHOLD =
  Number(import.meta.env.VITE_COMPACT_THRESHOLD) || 200;

const isConstraintError = (err: unknown): boolean =>
  err instanceof Dexie.ConstraintError ||
  (err as { name?: string } | null)?.name === 'ConstraintError';

const updateRow = (docId: string, payload: Uint8Array) => ({
  docId,
  engine: 'yjs' as const,
  formatVersion: 1 as const,
  payload,
  createdAt: Date.now(),
});

const appendUpdate = async (docId: string, bytes: Uint8Array): Promise<void> => {
  await db.docUpdates.add(updateRow(docId, bytes));
};

const loadAllUpdates = async (docId: string): Promise<Uint8Array[]> =>
  (await db.docUpdates.where('docId').equals(docId).toArray()).map(
    (row) => row.payload,
  );

const trySeedDoc = (
  docId: string,
  seed: Uint8Array,
): Promise<'seeded' | 'already-seeded'> =>
  db.transaction('rw', db.meta, db.docUpdates, async () => {
    try {
      // add() rejects with ConstraintError if the seed key already exists, so
      // exactly one concurrent caller wins the seed.
      await db.meta.add({ key: collabSeedKey(docId), value: { seededAt: Date.now() } });
    } catch (err) {
      if (isConstraintError(err)) return 'already-seeded' as const;
      throw err;
    }
    await db.docUpdates.add(updateRow(docId, seed));
    return 'seeded' as const;
  });

const reseedDocIfEmpty = (
  docId: string,
  seed: Uint8Array,
): Promise<'seeded' | 'occupied'> =>
  db.transaction('rw', db.meta, db.docUpdates, async () => {
    // Overlapping-scope rw transactions serialise, so this count-then-write is
    // atomic: a concurrent caller sees the seed row and reports 'occupied'.
    const count = await db.docUpdates.where('docId').equals(docId).count();
    if (count > 0) return 'occupied' as const;
    // The log is empty. Overwrite the seed marker (it may be stale-present or
    // wiped) and replant the seed so the next editor open has state to load.
    await db.meta.put({ key: collabSeedKey(docId), value: { seededAt: Date.now() } });
    await db.docUpdates.add(updateRow(docId, seed));
    return 'seeded' as const;
  });

const compactDoc = async (docId: string): Promise<void> => {
  await db.transaction('rw', db.docUpdates, async () => {
    const rows = await db.docUpdates.where('docId').equals(docId).toArray();
    if (rows.length <= COMPACT_THRESHOLD) return;
    // Collect the exact primary keys we read; deleting by these (never by a
    // where('docId') range) means a row appended after this read survives.
    const ids = rows
      .map((row) => row.id)
      .filter((id): id is number => id !== undefined);
    const merged = Y.mergeUpdates(rows.map((row) => row.payload)); // synchronous
    await db.docUpdates.bulkDelete(ids);
    await db.docUpdates.add(updateRow(docId, merged));
  });
};

const deleteDocLog = async (docId: string): Promise<void> => {
  await db.transaction('rw', db.docUpdates, db.meta, async () => {
    await db.docUpdates.where('docId').equals(docId).delete();
    await db.meta.delete(collabSeedKey(docId));
  });
};

export const createDexieCollabStore = (): CollabStore => ({
  append: appendUpdate,
  loadAll: loadAllUpdates,
  trySeed: trySeedDoc,
  reseedIfEmpty: reseedDocIfEmpty,
  compact: compactDoc,
  deleteDoc: deleteDocLog,
});

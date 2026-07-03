import Dexie from 'dexie';
import * as Y from 'yjs';
import { db } from '@/db/db';
import type { CollabStore } from '@/lib/collab/types';
import { collabSeedKey } from '@/lib/collab/seedKey';

/**
 * Dexie-backed {@link CollabStore}: a document's CRDT history is an append-only
 * log of `docUpdates` rows, compacted in place once it grows past a threshold.
 *
 * It lives inside the `yjs/` boundary because {@link compact} merges updates with
 * `Y.mergeUpdates`, which is engine-specific — but it implements the
 * engine-agnostic {@link CollabStore} interface so callers stay decoupled.
 */

// The log is compacted once it grows past this many rows. Overridable at build
// time (the e2e build lowers it) so the merge path is reachable in tests; the
// production default is 200.
const COMPACT_THRESHOLD =
  Number(import.meta.env.VITE_COMPACT_THRESHOLD) || 200;

const isConstraintError = (err: unknown): boolean =>
  err instanceof Dexie.ConstraintError ||
  (err as { name?: string } | null)?.name === 'ConstraintError';

export const createDexieCollabStore = (): CollabStore => ({
  append: async (docId, bytes) => {
    await db.docUpdates.add({
      docId,
      engine: 'yjs',
      formatVersion: 1,
      payload: bytes,
      createdAt: Date.now(),
    });
  },

  loadAll: async (docId) =>
    (await db.docUpdates.where('docId').equals(docId).toArray()).map(
      (row) => row.payload,
    ),

  trySeed: (docId, seed) =>
    db.transaction('rw', db.meta, db.docUpdates, async () => {
      try {
        // add() rejects with ConstraintError if the seed key already exists,
        // so exactly one concurrent caller wins the seed.
        await db.meta.add({ key: collabSeedKey(docId), value: { seededAt: Date.now() } });
      } catch (err) {
        if (isConstraintError(err)) return 'already-seeded' as const;
        throw err;
      }
      await db.docUpdates.add({
        docId,
        engine: 'yjs',
        formatVersion: 1,
        payload: seed,
        createdAt: Date.now(),
      });
      return 'seeded' as const;
    }),

  compact: async (docId) => {
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
      await db.docUpdates.add({
        docId,
        engine: 'yjs',
        formatVersion: 1,
        payload: merged,
        createdAt: Date.now(),
      });
    });
  },

  deleteDoc: async (docId) => {
    await db.transaction('rw', db.docUpdates, db.meta, async () => {
      await db.docUpdates.where('docId').equals(docId).delete();
      await db.meta.delete(collabSeedKey(docId));
    });
  },
});

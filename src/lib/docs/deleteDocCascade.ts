import { db } from '@/db/db';
import type { LoremDB } from '@/db/LoremDB';
import { invariant } from '@/lib/invariant';
import { collabStore } from '@/lib/collab/collabStore';

/**
 * Permanently delete a single document and everything keyed to it: its
 * annotations, its revision history, and its collaborative CRDT state. Brain
 * Space notes that linked to the document are *unlinked* (not deleted — a note
 * is independent content) so they no longer open a dead document route.
 *
 * The relational rows are removed in one transaction (doc row last so the
 * cascade is atomic), then the CRDT log and seed marker are cleared through the
 * store. The doc row is gone before the CRDT cleanup, so an interruption leaves
 * only harmless orphan update rows — never a live doc with a dead/empty log.
 */
export const deleteDocCascade = async (
  docId: string,
  database: LoremDB = db,
): Promise<void> => {
  invariant(docId, 'deleteDocCascade: docId is required');
  await database.transaction(
    'rw',
    [database.docs, database.annotations, database.revisions, database.notes],
    async () => {
      await database.annotations.where('docId').equals(docId).delete();
      await database.revisions.where('docId').equals(docId).delete();
      // linkedDocId is unindexed — and encrypted under cloud sync, so a cursor
      // filter would not see it. Read the notes decrypted, then re-put the ones
      // that pointed at the deleted doc with the link cleared.
      const linked = (await database.notes.toArray()).filter(
        (note) => note.linkedDocId === docId,
      );
      await Promise.all(
        linked.map((note) => database.notes.put({ ...note, linkedDocId: undefined })),
      );
      await database.docs.delete(docId);
    },
  );
  await collabStore.deleteDoc(docId);
};

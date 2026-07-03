import { db } from '@/db/db';
import { invariant } from '@/lib/invariant';
import { collabStore } from '@/lib/collab/collabStore';

/**
 * Permanently delete a single document and everything keyed to it: its
 * annotations, its revision history, and its collaborative CRDT state.
 *
 * The relational rows are removed in one transaction (doc row last so the
 * cascade is atomic), then the CRDT log and seed marker are cleared through the
 * store. The doc row is gone before the CRDT cleanup, so an interruption leaves
 * only harmless orphan update rows — never a live doc with a dead/empty log.
 */
export const deleteDocCascade = async (docId: string): Promise<void> => {
  invariant(docId, 'deleteDocCascade: docId is required');
  await db.transaction('rw', [db.docs, db.annotations, db.revisions], async () => {
    await db.annotations.where('docId').equals(docId).delete();
    await db.revisions.where('docId').equals(docId).delete();
    await db.docs.delete(docId);
  });
  await collabStore.deleteDoc(docId);
};

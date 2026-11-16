import type { LoremDB } from '@/db/LoremDB';
import { appLogger } from '@/lib/appLogger';
import { broadcastDocReload } from '@/lib/collab/docReloadChannel';
import { reconcileDocForMount } from '@/lib/reconcile';

/**
 * Make a document a peer just wrote visible where it is being read.
 *
 * A materialised frame updates the `docs` row and stops there. Every other
 * surface in the app reads its rows through a live query and so refreshes
 * itself, but a document is the exception: its editor renders from the CRDT log
 * (`docUpdates`, local-only and never replicated), seeded once when the editor
 * mounts. The row moving underneath it changes nothing on screen — the arriving
 * text stays invisible until the editor is remounted by navigating away and
 * back.
 *
 * So the arriving body is put through the same gate a mount uses. That gate
 * already knows how to weigh a foreign body against local work, and already
 * knows the two ways to apply one: through a live editor, or by reseeding the
 * log under a closed one.
 *
 * **Only a reseeded document is announced.** A body pushed through a live
 * editor reaches every other tab by itself — the editors share the document
 * over their own channel — and remounting them would discard editors that are
 * already correct. A reseeded log is the case they cannot survive: theirs no
 * longer exists, so they are told to remount onto the new one. A document that
 * needed nothing is announced to nobody, or every frame that changed nothing
 * would remount every tab.
 */

interface InboundDocRefreshOptions {
  db: LoremDB;
  /** The documents foreign put frames just applied to, deduplicated. */
  docIds: readonly string[];
}

/**
 * Reconcile one document, reporting whether other tabs need to hear about it.
 *
 * A document that fails is one document: the sweep that called this has already
 * journalled and materialised everything, and none of that should be undone
 * because a single editor refused a body.
 */
const refreshOne = async (db: LoremDB, docId: string): Promise<boolean> => {
  try {
    const doc = await db.docs.get(docId);
    // Gone between the frame applying and this running — a later delete, or a
    // row this device holds no key for.
    if (typeof doc?.body !== 'string') return false;
    const action = await reconcileDocForMount(docId, doc.body, {
      cleanSnapshotRevision: 'skip',
    });
    return action === 'reseeded';
  } catch (error: unknown) {
    appLogger.warn('refreshing a document a peer wrote failed', { docId, error });
    return false;
  }
};

export const refreshInboundDocs = async ({
  db,
  docIds,
}: InboundDocRefreshOptions): Promise<void> => {
  const reseeded: string[] = [];
  for (const docId of docIds) {
    if (await refreshOne(db, docId)) reseeded.push(docId);
  }
  if (reseeded.length > 0) broadcastDocReload(reseeded);
};

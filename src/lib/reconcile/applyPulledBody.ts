import { collabStore } from '@/lib/collab/collabStore';
import { getEditorHandle } from '@/lib/collab/editorRegistry';
import { acceptPulledDocBody, seedDocCrdt } from '@/lib/docs';
import type { Reconcilable, ReconcileResult } from './reconcile.types';

/** Clear the stale CRDT lineage and reseed from the pulled body (unmounted doc). */
const reseedFromBody = async (docId: string, body: string): Promise<void> => {
  await collabStore.deleteDoc(docId);
  await seedDocCrdt(docId, body);
};

/**
 * Bring the pulled body in, through the live editor if mounted, else the log,
 * then record it as the local body baseline — only after the CRDT write succeeds,
 * so a failed restore leaves the doc to retry rather than recording a false accept.
 */
export const applyPulledBody = async (doc: Reconcilable): Promise<ReconcileResult> => {
  const handle = getEditorHandle(doc.id);
  if (handle) {
    // Await the restore so a failed CRDT write throws here (and the doc is left
    // to retry on the next sweep) rather than being recorded as a success.
    await handle.restoreBody(doc.body);
    await acceptPulledDocBody(doc.id, doc.body);
    return { docId: doc.id, action: 'restored' };
  }
  await reseedFromBody(doc.id, doc.body);
  await acceptPulledDocBody(doc.id, doc.body);
  return { docId: doc.id, action: 'reseeded' };
};

import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import type { SyncState } from 'dexie-cloud-addon';
import { collabStore } from '@/lib/collab/collabStore';
import { seedFromLexicalJson } from '@/lib/collab/yjs/seed';
import { serializeDocSnapshot } from '@/lib/collab/yjs/snapshot';
import { getEditorHandle } from '@/lib/collab/editorRegistry';
import { seedDocCrdt } from '@/lib/docs';
import { createRevision } from '@/lib/revisions';
import { cloudSyncState } from './cloudClient';
import type { CloudObservable } from './cloudObservable';

/**
 * The cloud-pull → editor reconciliation bridge.
 *
 * Since Stage 2 the editor renders from the Y.Doc rebuilt out of the local,
 * unsynced `docUpdates` log — so a `docs.body` pulled from another device never
 * reaches a mounted editor and would be overwritten by the local CRDT dual-write.
 * After each sync settles, this reconciles every row body that the local CRDT did
 * not produce: cross-device concurrent edits resolve **whole-document
 * last-writer-wins**, with the losing local side kept as a recoverable revision.
 * Lossless CRDT-level merge is a recorded Stage 3 open decision, not attempted here.
 */

export interface ReconcileResult {
  docId: string;
  action: 'restored' | 'reseeded';
}

/**
 * Canonicalise a body through the CRDT seed → snapshot round-trip. Two bodies
 * with identical content but different (stale) field defaults — e.g. a
 * never-opened doc still carrying the pre-`textFormat` empty-body constant —
 * then compare equal, which is what keeps reconciliation idempotent.
 */
const canonicaliseBody = (docId: string, body: string): string =>
  serializeDocSnapshot(docId, [seedFromLexicalJson(docId, body)]);

/**
 * True when the row body was produced by the local dual-write: it matches the
 * serialised snapshot of the local Y.Doc directly (the steady-state fast path),
 * or matches once both are canonicalised (formatting-only differences).
 */
const isLocallyProduced = (
  docId: string,
  localSnapshot: string,
  body: string,
): boolean =>
  localSnapshot === body ||
  localSnapshot === canonicaliseBody(docId, body);

/** Clear the stale CRDT lineage and reseed from the pulled body (unmounted doc). */
const reseedFromBody = async (docId: string, body: string): Promise<void> => {
  await collabStore.deleteDoc(docId);
  await seedDocCrdt(docId, body);
};

const reconcileDoc = async (doc: Doc): Promise<ReconcileResult | null> => {
  const updates = await collabStore.loadAll(doc.id);
  const localSnapshot = serializeDocSnapshot(doc.id, updates);
  if (isLocallyProduced(doc.id, localSnapshot, doc.body)) return null;

  // Preserve the losing local side before the pulled body wins.
  await createRevision(doc.id, localSnapshot, {
    kind: 'manual',
    label: 'pre-sync',
  });

  const handle = getEditorHandle(doc.id);
  if (handle) {
    // A mounted editor: replay through its live handle so the change flows into
    // the CRDT binding and is persisted + broadcast (an untagged local update).
    handle.restoreBody(doc.body);
    return { docId: doc.id, action: 'restored' };
  }
  await reseedFromBody(doc.id, doc.body);
  return { docId: doc.id, action: 'reseeded' };
};

/**
 * Reconcile every document whose row body was pulled rather than locally
 * authored. Idempotent: a second run over already-reconciled docs is a no-op.
 */
export const reconcilePulledDocs = async (): Promise<ReconcileResult[]> => {
  const docs = await db.docs.toArray();
  const results: ReconcileResult[] = [];
  for (const doc of docs) {
    const result = await reconcileDoc(doc);
    if (result) results.push(result);
  }
  return results;
};

/**
 * Subscribe to the cloud sync engine and reconcile after each transition out of
 * the `pulling` phase, plus once when a fresh device first reaches `in-sync`.
 * Returns an unsubscribe. A no-op on a plain (non-cloud) database, whose sync
 * state never leaves `initial`, so ordinary users run no cloud code path.
 */
export const startCloudReconciler = (
  observable: CloudObservable<SyncState> = cloudSyncState(),
  run: () => Promise<unknown> = reconcilePulledDocs,
): (() => void) => {
  let prevPhase: SyncState['phase'] | undefined;
  let ranInitial = false;
  const subscription = observable.subscribe((state) => {
    const leftPulling = prevPhase === 'pulling' && state.phase !== 'pulling';
    const initialComplete = !ranInitial && state.phase === 'in-sync';
    prevPhase = state.phase;
    if (leftPulling || initialComplete) {
      ranInitial = true;
      void run();
    }
  });
  return () => {
    subscription.unsubscribe();
  };
};

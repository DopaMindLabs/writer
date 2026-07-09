import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import type { SyncState } from 'dexie-cloud-addon';
import { collabStore } from '@/lib/collab/collabStore';
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

/** Clear the stale CRDT lineage and reseed from the pulled body (unmounted doc). */
const reseedFromBody = async (docId: string, body: string): Promise<void> => {
  await collabStore.deleteDoc(docId);
  await seedDocCrdt(docId, body);
};

/** Bring the pulled body in, through the live editor if mounted, else the log. */
const applyPulledBody = async (doc: Doc): Promise<ReconcileResult> => {
  const handle = getEditorHandle(doc.id);
  if (handle) {
    handle.restoreBody(doc.body);
    return { docId: doc.id, action: 'restored' };
  }
  await reseedFromBody(doc.id, doc.body);
  return { docId: doc.id, action: 'reseeded' };
};

const reconcileDoc = async (doc: Doc): Promise<ReconcileResult | null> => {
  const updates = await collabStore.loadAll(doc.id);
  const localSnapshot = serializeDocSnapshot(doc.id, updates);
  // Every body is canonical serialized Lexical JSON, so a locally-produced row
  // equals its CRDT snapshot exactly.
  if (localSnapshot === doc.body) return null;

  // The CRDT lineage is gone (e.g. the cloud addon's logout cleared the
  // local-only docUpdates log) while the pulled row still has a body. There is
  // no local edit to preserve — the empty-log snapshot is an artefact — so heal
  // straight from the body, without a spurious "pre-sync" revision.
  if (updates.length === 0) return applyPulledBody(doc);

  const handle = getEditorHandle(doc.id);
  // A mounted editor mid-autosave holds the user's latest keystrokes in the CRDT
  // while `docs.body` still lags behind the 600 ms debounce — which reads as
  // divergence. Flushing settles that pending save; if it wrote, this was
  // same-device lag, never a remote pull, so leave the live editor untouched.
  if (handle?.flush?.()) return null;

  // Genuine divergence with real local edits: keep the losing local side
  // recoverable, then bring in the pulled body.
  await createRevision(doc.id, localSnapshot, {
    kind: 'manual',
    label: 'pre-sync',
  });
  return applyPulledBody(doc);
};

/**
 * Reconcile every document whose row body was pulled rather than locally
 * authored. Idempotent: a second run over already-reconciled docs is a no-op.
 */
export const reconcilePulledDocs = async (): Promise<ReconcileResult[]> => {
  const docs = await db.docs.toArray();
  const results: ReconcileResult[] = [];
  for (const doc of docs) {
    // Isolate per-doc failures: one unreconcilable row must never abort the
    // sweep and leave the rest of the library unhealed.
    try {
      const result = await reconcileDoc(doc);
      if (result) results.push(result);
    } catch (error) {
      console.error('cloud reconcile failed for doc', doc.id, error);
    }
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

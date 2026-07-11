import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import type { SyncState } from 'dexie-cloud-addon';
import { collabStore } from '@/lib/collab/collabStore';
import { serializeDocSnapshot } from '@/lib/collab/yjs/snapshot';
import { getEditorHandle } from '@/lib/collab/editorRegistry';
import { seedDocCrdt } from '@/lib/docs';
import { createRevision } from '@/lib/revisions';
import { NO_FLUSH, type FlushResult } from '@/lib/collab/flush.types';
import { cloudSyncState, cloudSyncComplete } from './cloudClient';
import { onDeviceKeyRingChange } from './crypto/keyStore';
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
  /** `restored`/`reseeded`: pulled body applied. `kept-local`: unsaved local edits
   *  won, and the pulled body was preserved as a recoverable safety revision. */
  action: 'restored' | 'reseeded' | 'kept-local';
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

  // Capture the freshly pulled remote body before any flush can overwrite it in
  // the row — we keep it in memory so it survives even if the flush persists local.
  const pulledBody = doc.body;
  const handle = getEditorHandle(doc.id);
  // A mounted editor mid-autosave holds the user's latest keystrokes in the CRDT
  // while `docs.body` still lags behind the 600 ms debounce — which reads as
  // divergence. Await the flush so its write lands before we decide the winner.
  const flushed = await (handle?.flush?.() ?? Promise.resolve<FlushResult>(NO_FLUSH));

  if (flushed.persisted) {
    // The flush wrote unsaved local keystrokes to the row: this was same-device
    // lag, not a remote pull. Keep the live local editor, but do not discard the
    // remote body it just replaced — preserve it as a recoverable safety revision
    // and queue a follow-up round so both sides converge by whole-document LWW.
    await createRevision(doc.id, pulledBody, { kind: 'manual', label: 'pre-sync' });
    requestReconcile('manual');
    return { docId: doc.id, action: 'kept-local' };
  }

  // No unsaved local edits: genuine divergence, and the pulled remote body wins.
  // Keep the losing local snapshot recoverable, then bring in the pulled body.
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

/** What prompted a reconcile run — recorded for diagnostics and rerun tracking. */
export type ReconcileTrigger =
  | 'initial'
  | 'pull'
  | 'sync-complete'
  | 'key-acquired'
  | 'manual';

/**
 * The active reconciler's single-flight request function, or `null` when no
 * reconciler is running. Lets the UI (e.g. a retry button) drive the *same*
 * serialised run path as the automatic triggers.
 */
let requestActive: ((trigger: ReconcileTrigger) => void) | null = null;

/** Ask the running reconciler to reconcile once (serialised). No-op if none is
 *  running — e.g. a plain database, where nothing was ever started. */
export const requestReconcile = (trigger: ReconcileTrigger = 'manual'): void => {
  requestActive?.(trigger);
};

/** Dependencies of {@link startCloudReconciler}; all injectable for tests. */
export interface CloudReconcilerDeps {
  syncState?: CloudObservable<SyncState>;
  syncComplete?: CloudObservable<void>;
  onKeyChange?: (listener: () => void) => () => void;
  run?: () => Promise<unknown>;
}

/**
 * Keep document reconciliation armed for the whole session. It runs on four
 * signals: the first `in-sync`, every transition out of `pulling`, every settled
 * `syncComplete`, and every device-key change (so rows hidden while keyless
 * reconcile the instant the key arrives). Runs are **single-flight**: a trigger
 * during an active run schedules exactly one follow-up that starts after the
 * current run settles, so overlapping sweeps can never race. Rejections are
 * swallowed here (per-document isolation lives in `reconcilePulledDocs`, and the
 * status facade records failures) so a bad run never tears down the
 * subscriptions. Returns an unsubscribe for every source. A no-op on a plain
 * (non-cloud) database, whose observables never emit.
 */
export const startCloudReconciler = (
  deps: CloudReconcilerDeps = {},
): (() => void) => {
  const {
    syncState = cloudSyncState(),
    syncComplete = cloudSyncComplete(),
    onKeyChange = onDeviceKeyRingChange,
    run = reconcilePulledDocs,
  } = deps;

  let stopped = false;
  let running = false;
  let queuedTrigger: ReconcileTrigger | null = null;

  const request = (trigger: ReconcileTrigger): void => {
    if (stopped) return;
    if (running) {
      // Coalesce: at most one follow-up run, remembering the latest trigger.
      queuedTrigger = trigger;
      return;
    }
    running = true;
    void Promise.resolve(run())
      .catch(() => undefined)
      .finally(() => {
        running = false;
        if (queuedTrigger !== null && !stopped) {
          const next = queuedTrigger;
          queuedTrigger = null;
          request(next);
        }
      });
  };
  requestActive = request;

  let prevPhase: SyncState['phase'] | undefined;
  let ranInitial = false;
  const syncSub = syncState.subscribe((state) => {
    const leftPulling = prevPhase === 'pulling' && state.phase !== 'pulling';
    const initialComplete = !ranInitial && state.phase === 'in-sync';
    prevPhase = state.phase;
    if (leftPulling || initialComplete) {
      ranInitial = true;
      request(leftPulling ? 'pull' : 'initial');
    }
  });
  const syncCompleteSub = syncComplete.subscribe(() => {
    request('sync-complete');
  });
  const stopKeyChange = onKeyChange(() => {
    request('key-acquired');
  });

  return () => {
    stopped = true;
    syncSub.unsubscribe();
    syncCompleteSub.unsubscribe();
    stopKeyChange();
    if (requestActive === request) requestActive = null;
  };
};

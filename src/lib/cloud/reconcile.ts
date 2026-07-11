import { db } from '@/db/db';
import type { Doc } from '@/db/schema';
import type { SyncState, UserLogin } from 'dexie-cloud-addon';
import { collabStore } from '@/lib/collab/collabStore';
import { serializeDocSnapshot } from '@/lib/collab/yjs/snapshot';
import { getEditorHandle, mountedDocIds } from '@/lib/collab/editorRegistry';
import { seedDocCrdt } from '@/lib/docs';
import { createRevision } from '@/lib/revisions';
import { NO_FLUSH, type FlushResult } from '@/lib/collab/flush.types';
import { cloudSyncState, cloudSyncComplete, cloudCurrentUser } from './cloudClient';
import { onDeviceKeyRingChange } from './crypto/keyStore';
import {
  reconcileStatus,
  sanitiseReconcileError,
  type ReconcileTrigger,
} from './reconcileStatus';
import type { CloudObservable } from './cloudObservable';

export type { ReconcileTrigger } from './reconcileStatus';

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
    requestReconcile('kept-local');
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

/** How many unmounted docs to process before yielding the event loop. */
const RECONCILE_BATCH = 8;

/**
 * The last row body each doc was seen with at a *successful* reconcile. A doc
 * whose body is unchanged since then needs no CRDT load or headless snapshot, so
 * a repeat sweep of a large, idle library is cheap. Correctness never depends on
 * it: clearing it only costs recomputation and yields identical results. Bounded
 * by the live document count — pruned each sweep.
 */
const lastReconciledBody = new Map<string, string>();

/** Reset the unchanged-skip cache (e.g. on sign-out, or between tests). */
export const resetReconcileState = (): void => {
  lastReconciledBody.clear();
};

/** Yield to the event loop so a long background sweep never blocks the UI. */
const yieldToScheduler = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/** The outcome of reconciling one document within a sweep. */
type OneOutcome =
  | { kind: 'skipped' }
  | { kind: 'done'; result: ReconcileResult | null }
  | { kind: 'failed'; message: string };

/** Reconcile one doc, skipping unchanged bodies and isolating per-doc failures. */
const reconcileOne = async (doc: Doc): Promise<OneOutcome> => {
  // Unchanged since it last reconciled cleanly: nothing new was pulled, so the
  // expensive CRDT load + snapshot would only reconfirm convergence.
  if (lastReconciledBody.get(doc.id) === doc.body) return { kind: 'skipped' };
  try {
    const result = await reconcileDoc(doc);
    // Record only on success; a thrown doc retries on the next sweep.
    lastReconciledBody.set(doc.id, doc.body);
    return { kind: 'done', result };
  } catch (error) {
    console.error('cloud reconcile failed for doc', doc.id, error);
    return { kind: 'failed', message: sanitiseReconcileError(error) };
  }
};

/** A reconcile sweep's results plus diagnostic counters for the status store. */
export interface ReconcileSummary extends ReconcileCounts {
  results: ReconcileResult[];
  /** Sanitised message of the last per-doc failure, if any. */
  lastError: string | null;
}

interface ReconcileCounts {
  scanned: number;
  skipped: number;
  reconciled: number;
  failed: number;
  activeDocLatencyMs: number | null;
}

/**
 * Reconcile every document whose row body was pulled rather than locally
 * authored, returning a summary. Mounted (active) documents are processed first,
 * so the doc the user is looking at converges before the background sweep of the
 * rest; unmounted docs then run in bounded batches that yield the event loop
 * between them, and docs unchanged since their last reconcile are skipped.
 */
const reconcileLibrary = async (): Promise<ReconcileSummary> => {
  const docs = await db.docs.toArray();
  const present = new Set(docs.map((doc) => doc.id));
  // Keep the skip-cache bounded: drop entries for docs no longer in the library.
  for (const id of lastReconciledBody.keys()) {
    if (!present.has(id)) lastReconciledBody.delete(id);
  }

  const mounted = new Set(mountedDocIds());
  const results: ReconcileResult[] = [];
  let skipped = 0;
  let failed = 0;
  let lastError: string | null = null;
  const tally = (outcome: OneOutcome): void => {
    if (outcome.kind === 'skipped') skipped += 1;
    else if (outcome.kind === 'failed') {
      failed += 1;
      lastError = outcome.message;
    } else if (outcome.result) results.push(outcome.result);
  };

  // Active documents first, preserving stable order within the group.
  const startedAt = Date.now();
  const hasMounted = docs.some((doc) => mounted.has(doc.id));
  for (const doc of docs) {
    if (mounted.has(doc.id)) tally(await reconcileOne(doc));
  }
  const activeDocLatencyMs = hasMounted ? Date.now() - startedAt : null;

  // Then the rest, in bounded batches yielding to the event loop between them.
  let sinceYield = 0;
  for (const doc of docs) {
    if (mounted.has(doc.id)) continue;
    tally(await reconcileOne(doc));
    sinceYield += 1;
    if (sinceYield >= RECONCILE_BATCH) {
      sinceYield = 0;
      await yieldToScheduler();
    }
  }

  return {
    results,
    scanned: docs.length,
    skipped,
    reconciled: results.length,
    failed,
    activeDocLatencyMs,
    lastError,
  };
};

/**
 * Reconcile every pulled document. Idempotent: a second run over already
 * -reconciled docs is a no-op. This is the algorithm without status recording —
 * {@link reconcileWithStatus} wraps it for the automatic/retry run path.
 */
export const reconcilePulledDocs = async (): Promise<ReconcileResult[]> =>
  (await reconcileLibrary()).results;

let runCounter = 0;

/**
 * Run a reconcile sweep and record its outcome in {@link reconcileStatus} for the
 * cloud settings UI: `running` on start, then `succeeded`, or `failed` when the
 * sweep threw or any document failed. Only content-free diagnostics are stored.
 */
export const reconcileWithStatus = async (
  trigger: ReconcileTrigger,
): Promise<void> => {
  const runId = ++runCounter;
  const startedAt = Date.now();
  reconcileStatus.set({ state: 'running', trigger, runId, startedAt, queued: false });
  try {
    const summary = await reconcileLibrary();
    const endedAt = Date.now();
    const finished = {
      trigger,
      runId,
      startedAt,
      queued: false,
      endedAt,
      durationMs: endedAt - startedAt,
      scanned: summary.scanned,
      skipped: summary.skipped,
      reconciled: summary.reconciled,
      failed: summary.failed,
      activeDocLatencyMs: summary.activeDocLatencyMs,
    };
    reconcileStatus.set(
      summary.failed > 0 && summary.lastError
        ? { state: 'failed', error: summary.lastError, ...finished }
        : { state: 'succeeded', ...finished },
    );
  } catch (error) {
    const endedAt = Date.now();
    reconcileStatus.set({
      state: 'failed',
      error: sanitiseReconcileError(error),
      trigger,
      runId,
      startedAt,
      queued: false,
      endedAt,
      durationMs: endedAt - startedAt,
      scanned: 0,
      skipped: 0,
      reconciled: 0,
      failed: 1,
      activeDocLatencyMs: null,
    });
    throw error;
  }
};

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
  currentUser?: CloudObservable<UserLogin | undefined>;
  run?: (trigger: ReconcileTrigger) => Promise<unknown>;
}

/**
 * Clear the unchanged-skip cache when the user signs out. The addon's logout
 * wipes the local `docUpdates` CRDT log but leaves the `docs` rows, so after
 * signing back in an unchanged body would otherwise be *skipped* and its CRDT
 * never reseeded. Dropping the cache on sign-out makes the next pull re-seed
 * every doc. Returns an unsubscribe.
 */
const armSignOutReset = (
  currentUser: CloudObservable<UserLogin | undefined>,
): (() => void) => {
  let wasSignedIn = false;
  const sub = currentUser.subscribe((user) => {
    const signedIn = user?.isLoggedIn === true;
    if (wasSignedIn && !signedIn) resetReconcileState();
    wasSignedIn = signedIn;
  });
  return () => {
    sub.unsubscribe();
  };
};

/**
 * Arm the sync-phase reconcile triggers: the first `in-sync` (initial pull) and
 * every transition *out of* `pulling` (a later pull settling). Returns an
 * unsubscribe.
 */
const armPhaseTriggers = (
  syncState: CloudObservable<SyncState>,
  request: (trigger: ReconcileTrigger) => void,
): (() => void) => {
  let prevPhase: SyncState['phase'] | undefined;
  let ranInitial = false;
  const sub = syncState.subscribe((state) => {
    const leftPulling = prevPhase === 'pulling' && state.phase !== 'pulling';
    const initialComplete = !ranInitial && state.phase === 'in-sync';
    prevPhase = state.phase;
    if (leftPulling || initialComplete) {
      ranInitial = true;
      request(leftPulling ? 'pull' : 'initial');
    }
  });
  return () => {
    sub.unsubscribe();
  };
};

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
    currentUser = cloudCurrentUser(),
    run = reconcileWithStatus,
  } = deps;

  let stopped = false;
  let running = false;
  let queuedTrigger: ReconcileTrigger | null = null;

  const request = (trigger: ReconcileTrigger): void => {
    if (stopped) return;
    if (running) {
      // Coalesce: at most one follow-up run, remembering the latest trigger.
      queuedTrigger = trigger;
      // Reflect the queued rerun in the status if a run is being recorded.
      const current = reconcileStatus.current();
      if (current.state === 'running') {
        reconcileStatus.set({ ...current, queued: true });
      }
      return;
    }
    running = true;
    void Promise.resolve(run(trigger))
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

  const stopPhaseTriggers = armPhaseTriggers(syncState, request);
  const syncCompleteSub = syncComplete.subscribe(() => {
    request('sync-complete');
  });
  const stopKeyChange = onKeyChange(() => {
    request('key-acquired');
  });
  const stopSignOutReset = armSignOutReset(currentUser);

  return () => {
    stopped = true;
    stopPhaseTriggers();
    syncCompleteSub.unsubscribe();
    stopKeyChange();
    stopSignOutReset();
    if (requestActive === request) requestActive = null;
  };
};

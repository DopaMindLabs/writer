import { collabStore } from '@/lib/collab/collabStore';
import { serializeDocSnapshot } from '@/lib/collab/yjs/snapshot';
import {
  acceptPulledDocBody,
  readDocBodyBaseline,
  updateDocBody,
} from '@/lib/docs';
import { createRevision } from '@/lib/revisions';
import { applyPulledBody } from './applyPulledBody';
import type {
  MountReconcileAction,
  ReconcileMountOptions,
} from './reconcile.types';

/**
 * Reconcile a single document's CRDT against its row body — before its editor
 * mounts, and again whenever a body arrives underneath one that is already
 * mounted. The editor opens (or carries on) over a CRDT that equals `docs.body`,
 * and therefore equals the autosave baseline captured at mount, closing the
 * window where a stale CRDT is mistaken for unsaved edits.
 *
 * This is a local data-integrity gate, not sync behaviour: it runs on every
 * mount whether or not any sync provider is configured (closing the page inside
 * the autosave debounce leaves the CRDT ahead of the row on a purely local
 * device too). The frame sweep drives the same gate for the opposite reason —
 * a row a peer just wrote is invisible to an editor rendering from the CRDT
 * until something reconciles the two.
 *
 * The winner is decided by local body provenance, not wall clocks (which clock
 * skew between devices could invert). {@link readDocBodyBaseline} holds the exact
 * `docs.body` this device last wrote; Dexie Cloud changes `docs.body` directly and
 * never touches it:
 *
 * - **row equals the baseline** — the row is unchanged since our last local write,
 *   so the divergent CRDT holds unsaved keystrokes. The CRDT wins; the body is
 *   brought up to date.
 * - **row differs from the baseline** — the body was written elsewhere and pulled
 *   in. The body wins; the losing CRDT is kept as a recoverable revision first.
 * - **no baseline at all** — provenance cannot be proved, so the row is treated as
 *   the one that may have come from elsewhere and wins. Preferring the CRDT would
 *   push unprovable local text into a *synced* row and on to every other device,
 *   whereas a wrong guess this way stays local: the losing CRDT is kept as a
 *   recoverable revision either way, so neither side is lost.
 *
 * Idempotent: a doc whose CRDT already equals its body is left untouched.
 */

/** The decision itself, run once the queue below reaches this document. */
const reconcileNow = async (
  docId: string,
  body: string,
  options: ReconcileMountOptions,
): Promise<MountReconcileAction> => {
  const updates = await collabStore.loadAll(docId);
  const localSnapshot = serializeDocSnapshot(docId, updates);
  if (localSnapshot === body) {
    await acceptPulledDocBody(docId, body);
    return 'accepted';
  }

  // No CRDT lineage (a cloud sign-out clears the local-only log) but the row still
  // has a body: there is nothing local to preserve, so heal straight from it.
  if (updates.length === 0) {
    return (await applyPulledBody({ id: docId, body })).action;
  }

  const baseline = await readDocBodyBaseline(docId);
  if (baseline === null) {
    // The marker is written transactionally with every row write, so its absence
    // means something upstream went wrong. Report it — but do not fail the gate:
    // a throw here is deterministic, so retry can never clear it and the document
    // becomes permanently unopenable. Fall through to the row-wins path, which
    // discards nothing.
    console.warn('reconcile: no body baseline for divergent doc', docId);
  }
  if (baseline === body) {
    // Unsaved keystrokes: the row still equals what we last wrote, so persist the
    // CRDT snapshot rather than discarding it.
    await updateDocBody(docId, localSnapshot);
    return 'kept-local';
  }

  if (options.cleanSnapshotRevision !== 'skip' || baseline !== localSnapshot) {
    await createRevision(docId, localSnapshot, { kind: 'manual', label: 'pre-sync' });
  }
  return (await applyPulledBody({ id: docId, body })).action;
};

/**
 * One reconciliation of a document at a time, in the order they were asked for.
 *
 * The gate is no longer driven from a single place: sweeps of arriving frames
 * fire from three independent triggers and the mount gate runs alongside them.
 * Two passes at once would each read the state before either had written, and
 * both would mint the same safety revision. They are chained rather than
 * dropped, so the later one re-reads and settles on the newest body instead of
 * leaving the editor a version behind.
 */
const running = new Map<string, Promise<MountReconcileAction>>();

export const reconcileDocForMount = async (
  docId: string,
  body: string,
  options: ReconcileMountOptions = {},
): Promise<MountReconcileAction> => {
  const queued = running.get(docId);
  const settled = queued?.then(
    () => undefined,
    () => undefined,
  );
  const run = (settled ?? Promise.resolve()).then(() =>
    reconcileNow(docId, body, options),
  );
  running.set(docId, run);
  try {
    return await run;
  } finally {
    if (running.get(docId) === run) running.delete(docId);
  }
};

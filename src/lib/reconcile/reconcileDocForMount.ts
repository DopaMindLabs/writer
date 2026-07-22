import { collabStore } from '@/lib/collab/collabStore';
import { serializeDocSnapshot } from '@/lib/collab/yjs/snapshot';
import {
  acceptPulledDocBody,
  readDocBodyBaseline,
  updateDocBody,
} from '@/lib/docs';
import { invariant } from '@/lib/invariant';
import { createRevision } from '@/lib/revisions';
import { applyPulledBody } from './applyPulledBody';

/**
 * Reconcile a single document's CRDT against its row body **before its editor
 * mounts**, so the editor opens over a CRDT that already equals `docs.body` — and
 * therefore equals the autosave baseline captured at mount, closing the window
 * where a stale CRDT is mistaken for unsaved edits.
 *
 * This is a local data-integrity gate, not sync behaviour: it runs on every
 * mount whether or not any sync provider is configured (closing the page inside
 * the autosave debounce leaves the CRDT ahead of the row on a purely local
 * device too).
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
 *
 * Idempotent: a doc whose CRDT already equals its body is left untouched.
 */
export const reconcileDocForMount = async (
  docId: string,
  body: string,
): Promise<void> => {
  const updates = await collabStore.loadAll(docId);
  const localSnapshot = serializeDocSnapshot(docId, updates);
  if (localSnapshot === body) {
    await acceptPulledDocBody(docId, body);
    return;
  }

  // No CRDT lineage (a cloud sign-out clears the local-only log) but the row still
  // has a body: there is nothing local to preserve, so heal straight from it.
  if (updates.length === 0) {
    await applyPulledBody({ id: docId, body });
    return;
  }

  const baseline = await readDocBodyBaseline(docId);
  invariant(
    baseline !== null,
    `reconcileDocForMount: no body baseline for divergent doc ${docId}`,
  );
  if (baseline === body) {
    // Unsaved keystrokes: the row still equals what we last wrote, so persist the
    // CRDT snapshot rather than discarding it.
    await updateDocBody(docId, localSnapshot);
    return;
  }

  await createRevision(docId, localSnapshot, { kind: 'manual', label: 'pre-sync' });
  await applyPulledBody({ id: docId, body });
};

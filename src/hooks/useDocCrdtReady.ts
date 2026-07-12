import { useEffect, useRef, useState } from 'react';
import { reconcileDocForMount } from '@/lib/cloud/reconcile';

/**
 * Gate the editor mount until the document's CRDT log has been reconciled
 * against its current row body.
 *
 * Two states need repairing before the editor mounts. After a cloud sign-out
 * clears the local-only `docUpdates` log, a re-pulled row keeps its body but has
 * no CRDT lineage — mounting over that empty Y.Doc would render blank and let the
 * first autosave overwrite the real body. And when a body was pulled from another
 * device while the doc was closed, the local CRDT is populated but stale; mounting
 * over it would show old content and, worse, mismatch the autosave baseline
 * captured at mount (the row body), so a clean editor would look dirty to cloud
 * reconciliation. {@link reconcileDocForMount} repairs both — seeding an empty log
 * or reseeding a diverged one from the body (keeping the local side as a revision)
 * — and this reports ready only once it settles, so the editor mounts over a CRDT
 * that already equals the body.
 *
 * Keyed on `docId` alone; the latest `body` is read through a ref so ordinary
 * autosaves do not re-run the check or remount. Resets to not-ready only when the
 * document changes.
 */
export const useDocCrdtReady = (docId: string, body: string): boolean => {
  const [ready, setReady] = useState(false);
  const bodyRef = useRef(body);
  bodyRef.current = body;

  useEffect(() => {
    let active = true;
    setReady(false);
    void reconcileDocForMount(docId, bodyRef.current)
      .catch((error: unknown) => {
        // Surface the failure but do not trap the user on a blank surface: a
        // best-effort mount is better than an editor that never appears.
        console.error('Failed to reconcile the document CRDT before mount', error);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [docId]);

  return ready;
};

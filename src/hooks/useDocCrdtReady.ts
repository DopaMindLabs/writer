import { useEffect, useRef, useState } from 'react';
import { reconcileDocForMount } from '@/lib/cloud/reconcile';

/**
 * Gate the editor mount until the document's CRDT log has been reconciled
 * against its current row body.
 *
 * Three states need repairing before the editor mounts. After a cloud sign-out
 * clears the local-only `docUpdates` log, a re-pulled row keeps its body but has
 * no CRDT lineage — mounting over that empty Y.Doc would render blank and let the
 * first autosave overwrite the real body. When a body was pulled from another
 * device while the doc was closed, the local CRDT is populated but stale; mounting
 * over it would show old content and mismatch the autosave baseline captured at
 * mount, so a clean editor would look dirty to cloud reconciliation. And when the
 * page was closed inside the autosave debounce, the row body lags a CRDT that
 * holds the user's last keystrokes — those must be persisted, never discarded.
 *
 * {@link reconcileDocForMount} repairs all three, and this reports ready only once
 * it settles, so the editor mounts over a CRDT that already equals the body.
 *
 * Keyed on `docId` alone; the latest `body` and `updatedAt` are read through refs
 * so ordinary autosaves do not re-run the check or remount. Resets to not-ready
 * only when the document changes.
 */
export const useDocCrdtReady = (
  docId: string,
  body: string,
  updatedAt = 0,
): boolean => {
  const [ready, setReady] = useState(false);
  const bodyRef = useRef(body);
  bodyRef.current = body;
  const updatedAtRef = useRef(updatedAt);
  updatedAtRef.current = updatedAt;

  useEffect(() => {
    let active = true;
    setReady(false);
    void reconcileDocForMount(docId, bodyRef.current, updatedAtRef.current)
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

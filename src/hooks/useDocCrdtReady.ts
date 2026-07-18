import { useCallback, useEffect, useRef, useState } from 'react';
import { reconcileDocForMount } from '@/lib/cloud/cloudClient';
import { crdtMountFailDocId } from '@/lib/boot/e2eFaults';

/**
 * The mount-gate state for a document's editor:
 * - `pending` — reconciliation is in flight; the editor stays unmounted;
 * - `ready` — the CRDT equals the row body; the editor may mount;
 * - `failed` — reconciliation threw; the editor must **not** mount over
 *   unverified state. Carries a `retry` to run the gate again.
 */
export type DocCrdtReadiness =
  | { state: 'pending' }
  | { state: 'ready' }
  | { state: 'failed'; error: Error; retry: () => void };

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

/**
 * Gate the editor mount until the document's CRDT log has been reconciled against
 * its current row body. A failed reconciliation keeps the editor closed rather
 * than mounting over an empty or stale Y.Doc (which a later autosave could persist
 * over the real body); the surface can retry. Keyed on `docId`; the latest `body`
 * is read through a ref so ordinary autosaves neither re-run the gate nor remount.
 */
export const useDocCrdtReady = (docId: string, body: string): DocCrdtReadiness => {
  const [readiness, setReadiness] = useState<DocCrdtReadiness>({ state: 'pending' });
  const [attempt, setAttempt] = useState(0);
  const bodyRef = useRef(body);
  bodyRef.current = body;

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setReadiness({ state: 'pending' });
    const run =
      docId === crdtMountFailDocId()
        ? Promise.reject(new Error('forced CRDT mount failure (E2E)'))
        : reconcileDocForMount(docId, bodyRef.current);
    run
      .then(() => {
        if (active) setReadiness({ state: 'ready' });
      })
      .catch((error: unknown) => {
        if (active) setReadiness({ state: 'failed', error: toError(error), retry });
      });
    return () => {
      active = false;
    };
  }, [docId, attempt, retry]);

  return readiness;
};

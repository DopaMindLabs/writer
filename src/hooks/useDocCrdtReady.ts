import { useEffect, useRef, useState } from 'react';
import { ensureDocCrdtSeeded } from '@/lib/docs';

/**
 * Gate the editor mount until the document's CRDT log is known to be seeded.
 *
 * After a cloud sign-out clears the local-only `docUpdates` log, a re-pulled doc
 * row keeps its body but has no CRDT lineage. Mounting the editor over that empty
 * Y.Doc would render blank *and* let its first autosave overwrite the real body
 * with empty content. This repairs the log from the body (a no-op when the log
 * is already populated) and only reports ready once that settles.
 *
 * Keyed on `docId` alone; the latest `body` is read through a ref so ordinary
 * autosaves do not re-run the check. Resets to not-ready whenever the doc changes.
 */
export const useDocCrdtReady = (docId: string, body: string): boolean => {
  const [ready, setReady] = useState(false);
  const bodyRef = useRef(body);
  bodyRef.current = body;

  useEffect(() => {
    let active = true;
    setReady(false);
    void ensureDocCrdtSeeded(docId, bodyRef.current)
      .catch((error: unknown) => {
        // Surface the failure but do not trap the user on a blank surface: a
        // best-effort mount is better than an editor that never appears.
        console.error('Failed to ensure the document CRDT seed', error);
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

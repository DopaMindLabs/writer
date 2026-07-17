import { useEffect, useRef } from 'react';
import { captureBaselineRevision, resetAutoThrottle } from '@/lib/revisions';

/**
 * Capture the document's baseline revision once per mount (keyed by id), using
 * the body present at mount, and reset the auto-revision throttle when the
 * document changes or unmounts. The body is read through a ref so a later body
 * change — e.g. a cloud pull replacing `doc.body` — never re-captures the
 * baseline or moves it, while the effect depends only on the id.
 */
export const useMountBaselineRevision = (docId: string, body: string): void => {
  const bodyRef = useRef(body);
  bodyRef.current = body;
  useEffect(() => {
    void captureBaselineRevision(docId, bodyRef.current).catch((err: unknown) => {
      console.error('Failed to capture baseline revision', err);
    });
    return () => {
      resetAutoThrottle(docId);
    };
  }, [docId]);
};

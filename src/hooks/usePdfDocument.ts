import { useCallback, useEffect, useRef, useState } from 'react';
import { clonePdfBytes } from '@/lib/pdf/pdfBytes';

/**
 * The document handed to the pdf engine: a `data` view over a private copy of
 * the source bytes. Never the master buffer — pdf.js transfers and detaches
 * whatever it is given.
 */
export type PdfDocumentState =
  | { status: 'loading' }
  | { status: 'ready'; file: { data: Uint8Array } }
  | { status: 'error' };

/**
 * Reads a PDF blob into a retained master buffer and hands out an independent
 * copy per (re)load. The discipline here is load-bearing — every departure
 * re-opens a production incident PR #124 already paid for:
 *
 * - The blob is read **once** into a ref (`masterRef`); a `cancelled` flag makes
 *   the async set StrictMode-double-mount safe.
 * - Each ready `file` holds `clonePdfBytes(master)` — a **fresh copy** (pdf.js
 *   detaches the buffer it receives), while remaining a **stable identity**
 *   across plain re-renders (react-pdf reloads whenever the `file` prop identity
 *   changes, so a new object must appear only on a genuine (re)load).
 * - `reload` re-copies from the retained master, yielding a new `file` — the
 *   recovery path after the engine detaches a buffer and errors.
 * - The master buffer is never handed to the engine; no object URL is created
 *   (the CSP `connect-src` has no `blob:`).
 */
export const usePdfDocument = (
  blob: Blob | null,
): { state: PdfDocumentState; reload: () => void } => {
  const masterRef = useRef<ArrayBuffer | null>(null);
  const [state, setState] = useState<PdfDocumentState>({ status: 'loading' });

  useEffect(() => {
    masterRef.current = null;
    setState({ status: 'loading' });
    if (!blob) return;
    let cancelled = false;
    blob
      .arrayBuffer()
      .then((buffer) => {
        if (cancelled) return;
        masterRef.current = buffer;
        setState({ status: 'ready', file: { data: clonePdfBytes(buffer) } });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [blob]);

  const reload = useCallback(() => {
    const master = masterRef.current;
    if (master === null) return;
    setState({ status: 'ready', file: { data: clonePdfBytes(master) } });
  }, []);

  return { state, reload };
};

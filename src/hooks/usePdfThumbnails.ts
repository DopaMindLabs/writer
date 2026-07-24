import { useCallback, useEffect, useRef, useState } from 'react';
import { pdfjs } from '@/lib/pdf/pdfAdapter';
import { ensurePdfWorker } from '@/lib/pdf/pdfWorker';
import { clonePdfBytes } from '@/lib/pdf/pdfBytes';

type LoadingTask = ReturnType<typeof pdfjs.getDocument>;
type PdfDoc = Awaited<LoadingTask['promise']>;

export interface PdfThumbnails {
  /** page number → rendered PNG data URL, filled in as pages resolve. */
  thumbs: Record<number, string>;
  /** Ask for a page to be rendered; a no-op once it is queued or cached. */
  requestPage: (page: number) => void;
}

interface ThumbEngine {
  request: (page: number) => void;
  ready: (doc: PdfDoc) => void;
  destroy: () => void;
}

/**
 * Renders a page to a data URL at the requested width. A fresh offscreen canvas
 * per page keeps the engine's detach discipline off the shared master buffer.
 */
const renderThumb = async (
  doc: PdfDoc,
  page: number,
  width: number,
): Promise<string | null> => {
  const proxy = await doc.getPage(page);
  const base = proxy.getViewport({ scale: 1 });
  const viewport = proxy.getViewport({ scale: width / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const canvasContext = canvas.getContext('2d');
  if (!canvasContext) return null;
  await proxy.render({ canvas, canvasContext, viewport }).promise;
  return canvas.toDataURL('image/png');
};

/**
 * A single-document render queue: only pages that are requested render, one at a
 * time (FIFO), each cached and reported once through `setThumb`. Destroying it
 * stops further work and releases the document. Pure of React so the hook stays a
 * thin wire between it and effects.
 */
const createThumbEngine = (
  width: () => number,
  setThumb: (page: number, url: string) => void,
): ThumbEngine => {
  const queue: number[] = [];
  const requested = new Set<number>();
  let doc: PdfDoc | null = null;
  let rendering = false;
  let alive = true;

  const pump = (): void => {
    if (rendering || !doc) return;
    const page = queue.shift();
    if (page === undefined) return;
    rendering = true;
    void renderThumb(doc, page, width())
      .then((url) => { if (url && alive) setThumb(page, url); })
      .catch(() => undefined)
      .finally(() => { rendering = false; if (alive) pump(); });
  };

  return {
    request: (page) => {
      if (page < 1 || requested.has(page)) return;
      requested.add(page);
      queue.push(page);
      pump();
    },
    ready: (next) => { doc = next; pump(); },
    destroy: () => {
      alive = false;
      void doc?.destroy();
      doc = null;
      queue.length = 0;
      requested.clear();
    },
  };
};

/**
 * Lazy page thumbnails for one document. Opens its own copy of the bytes (pdf.js
 * detaches whatever it is handed), renders only pages the caller reports visible,
 * one at a time, caches each PNG data URL, and destroys the document on unmount.
 * The IntersectionObserver that drives `requestPage` lives in the rail, so this
 * hook stays a pure engine seam.
 */
export const usePdfThumbnails = (
  blob: Blob,
  options: { width: number },
): PdfThumbnails => {
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const widthRef = useRef(options.width);
  widthRef.current = options.width;
  const engineRef = useRef<ThumbEngine | null>(null);

  const requestPage = useCallback((page: number) => {
    engineRef.current?.request(page);
  }, []);

  useEffect(() => {
    const engine = createThumbEngine(
      () => widthRef.current,
      (page, url) => { setThumbs((prev) => ({ ...prev, [page]: url })); },
    );
    engineRef.current = engine;
    let cancelled = false;
    ensurePdfWorker();
    blob
      .arrayBuffer()
      .then((buffer) => pdfjs.getDocument({ data: clonePdfBytes(buffer) }).promise)
      .then((doc) => { if (cancelled) void doc.destroy(); else engine.ready(doc); })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      engine.destroy();
      engineRef.current = null;
    };
  }, [blob]);

  return { thumbs, requestPage };
};

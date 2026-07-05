import { useCallback, useState } from 'react';

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2;
const SCALE_STEP = 0.25;
const DEFAULT_SCALE = 1;

export interface PdfViewport {
  pageNumber: number;
  numPages: number;
  scale: number;
  /** Sets the page count and clamps the current page into range. */
  setNumPages: (pages: number) => void;
  prev: () => void;
  next: () => void;
  zoomOut: () => void;
  zoomIn: () => void;
}

/**
 * The viewer's page/zoom state — one bounded page at a time, zoom clamped to
 * [MIN_SCALE, MAX_SCALE] in fixed steps. Kept apart from the document's load
 * lifecycle so each concern changes for one reason.
 */
export const usePdfViewport = (): PdfViewport => {
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(DEFAULT_SCALE);

  const applyNumPages = useCallback((pages: number) => {
    setNumPages(pages);
    setPageNumber((current) => Math.min(Math.max(current, 1), pages));
  }, []);

  const prev = useCallback(() => {
    setPageNumber((p) => Math.max(1, p - 1));
  }, []);

  const next = useCallback(() => {
    setPageNumber((p) => Math.min(numPages, p + 1));
  }, [numPages]);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP));
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP));
  }, []);

  return { pageNumber, numPages, scale, setNumPages: applyNumPages, prev, next, zoomOut, zoomIn };
};

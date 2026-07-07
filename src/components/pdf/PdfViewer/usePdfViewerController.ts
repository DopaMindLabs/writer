import { useCallback } from 'react';
import { usePdfViewport } from './usePdfViewport';
import { usePdfLoad, type PdfLoad } from './usePdfLoad';

interface PdfViewerControllerInput {
  blob: Blob;
  page?: number;
  onPageChange?: (page: number) => void;
  scale?: number;
  onNumPagesChange?: (numPages: number) => void;
}

interface PdfViewerController {
  load: PdfLoad;
  pageNumber: number;
  scale: number;
  numPages: number;
  prev: () => void;
  next: () => void;
  isReady: boolean;
  showSkeleton: boolean;
}

/**
 * Bridges the viewer's own page/zoom state to the optional controlled props: when
 * `page`/`scale` are supplied the reader owns them and paging emits `onPageChange`;
 * otherwise the viewer runs uncontrolled. Also reports the parsed page count up.
 * Keeps `PdfViewer` a pure render.
 */
export const usePdfViewerController = ({
  blob,
  page,
  onPageChange,
  scale,
  onNumPagesChange,
}: PdfViewerControllerInput): PdfViewerController => {
  const view = usePdfViewport();
  const { setNumPages } = view;

  const reportNumPages = useCallback(
    (pages: number) => {
      setNumPages(pages);
      onNumPagesChange?.(pages);
    },
    [setNumPages, onNumPagesChange],
  );
  const load = usePdfLoad(blob, reportNumPages);

  const controlled = page !== undefined;
  const pageNumber = page ?? view.pageNumber;
  const isReady = load.status === 'ready';

  return {
    load,
    pageNumber,
    scale: scale ?? view.scale,
    numPages: view.numPages,
    prev: controlled ? () => onPageChange?.(pageNumber - 1) : view.prev,
    next: controlled ? () => onPageChange?.(pageNumber + 1) : view.next,
    isReady,
    showSkeleton: load.status === 'loading' || (isReady && view.numPages === 0),
  };
};

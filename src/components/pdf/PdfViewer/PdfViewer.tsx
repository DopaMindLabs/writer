import { type KeyboardEvent, type ReactNode } from 'react';
import { PdfViewerStatus } from './PdfViewerStatus';
import { PdfDocumentView } from './PdfDocumentView';
import { PdfPageView } from './PdfPageView';
import { usePdfViewerController } from './usePdfViewerController';

// Left/Right turn the page when focus is in the reading region and not in an
// input or the selection strip (so typing a note is never hijacked).
const handlePageKey = (
  event: KeyboardEvent<HTMLDivElement>,
  prev: () => void,
  next: () => void,
): void => {
  const target = event.target as HTMLElement;
  if (
    target.closest('input, textarea, [contenteditable="true"], [data-testid="pdf-selection-strip"]')
  ) {
    return;
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    prev();
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    next();
  }
};

export interface PdfViewerProps {
  blob: Blob;
  /** Accessible name for the viewer region. */
  title: string;
  /** Stage PE mounts the highlight layer here, over each page's canvas. */
  pageOverlay?: (page: number) => ReactNode;
  /** Stage PE reads the page element for highlight geometry. */
  onPageElement?: (page: number, el: HTMLElement | null) => void;
  /**
   * Controlled viewport. Stage PG lifts page/zoom to the reader so the pager,
   * crumb and overflow share one source; when omitted the viewer owns its own
   * page/zoom (the uncontrolled default used by tests and stories).
   */
  page?: number;
  onPageChange?: (page: number) => void;
  scale?: number;
  /** Reserved: the viewer has no in-view zoom gesture yet — the reader owns zoom
   * via the overflow — so a controlled `scale` is display-only for now. */
  onScaleChange?: (scale: number) => void;
  /** Reports the parsed page count so the reader can drive the pager and crumb. */
  onNumPagesChange?: (numPages: number) => void;
}

/**
 * Composes the decomposed viewer from the controller (page/zoom state + load
 * lifecycle) and the status / document / page pieces. Zoom and the page readout
 * live in the reader chrome now (the standing toolbar is gone); only arrow-key
 * paging stays here.
 */
export const PdfViewer = ({
  blob,
  title,
  pageOverlay,
  onPageElement,
  page,
  onPageChange,
  scale,
  onNumPagesChange,
}: PdfViewerProps) => {
  const ctl = usePdfViewerController({ blob, page, onPageChange, scale, onNumPagesChange });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    handlePageKey(event, ctl.prev, ctl.next);
  };

  return (
    <div
      role="region"
      aria-label={title}
      data-testid="pdf-viewer"
      className="flex h-full flex-col bg-paper-2"
    >
      {/* Focusable so keyboard users can scroll the page (a11y:
          scrollable-region-focusable); the region is named by the parent. */}
      <div tabIndex={0} onKeyDown={onKeyDown} className="relative flex-1 overflow-auto p-4">
        {ctl.load.status === 'error' ? (
          <PdfViewerStatus status="error" onRetry={ctl.load.retry} />
        ) : null}
        {ctl.showSkeleton ? <PdfViewerStatus status="loading" /> : null}
        {ctl.isReady && ctl.load.file ? (
          <PdfDocumentView
            file={ctl.load.file}
            onLoadSuccess={ctl.load.onLoadSuccess}
            onLoadError={ctl.load.onLoadError}
          >
            <PdfPageView
              page={ctl.pageNumber}
              numPages={ctl.numPages}
              scale={ctl.scale}
              pageOverlay={pageOverlay}
              onPageElement={onPageElement}
            />
          </PdfDocumentView>
        ) : null}
      </div>
    </div>
  );
};

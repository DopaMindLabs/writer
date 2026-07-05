import { type ReactNode } from 'react';
import { PdfViewerToolbar } from './PdfViewerToolbar';
import { PdfViewerStatus } from './PdfViewerStatus';
import { PdfDocumentView } from './PdfDocumentView';
import { PdfPageView } from './PdfPageView';
import { usePdfViewport, MIN_SCALE, MAX_SCALE } from './usePdfViewport';
import { usePdfLoad } from './usePdfLoad';

export interface PdfViewerProps {
  blob: Blob;
  /** Accessible name for the viewer region. */
  title: string;
  /** Stage PE mounts the highlight layer here, over each page's canvas. */
  pageOverlay?: (page: number) => ReactNode;
  /** Stage PE mounts the highlighter controls into the toolbar here. */
  toolbarExtras?: ReactNode;
  /** Stage PE reads the page element for highlight geometry. */
  onPageElement?: (page: number, el: HTMLElement | null) => void;
}

/**
 * Composes the decomposed viewer from two hooks — page/zoom state
 * (`usePdfViewport`) and the load lifecycle (`usePdfLoad`) — and the toolbar /
 * status / document / page pieces. Each unit owns one concern.
 */
export const PdfViewer = ({
  blob,
  title,
  pageOverlay,
  toolbarExtras,
  onPageElement,
}: PdfViewerProps) => {
  const view = usePdfViewport();
  const load = usePdfLoad(blob, view.setNumPages);

  const isReady = load.status === 'ready';
  const showSkeleton = load.status === 'loading' || (isReady && view.numPages === 0);

  return (
    <div
      role="region"
      aria-label={title}
      data-testid="pdf-viewer"
      className="flex h-full flex-col bg-paper-2"
    >
      <PdfViewerToolbar
        pageNumber={view.pageNumber}
        numPages={view.numPages}
        canPrev={isReady && view.pageNumber > 1}
        canNext={isReady && view.pageNumber < view.numPages}
        canZoomOut={isReady && view.scale > MIN_SCALE}
        canZoomIn={isReady && view.scale < MAX_SCALE}
        onPrev={view.prev}
        onNext={view.next}
        onZoomOut={view.zoomOut}
        onZoomIn={view.zoomIn}
        extras={toolbarExtras}
      />
      <div className="relative flex-1 overflow-auto p-4">
        {load.status === 'error' ? (
          <PdfViewerStatus status="error" onRetry={load.retry} />
        ) : null}
        {showSkeleton ? <PdfViewerStatus status="loading" /> : null}
        {isReady && load.file ? (
          <PdfDocumentView
            file={load.file}
            onLoadSuccess={load.onLoadSuccess}
            onLoadError={load.onLoadError}
          >
            <PdfPageView
              page={view.pageNumber}
              numPages={view.numPages}
              scale={view.scale}
              pageOverlay={pageOverlay}
              onPageElement={onPageElement}
            />
          </PdfDocumentView>
        ) : null}
      </div>
    </div>
  );
};

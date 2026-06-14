import { useCallback, useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from '@/components/libs/icons';
import { IconButton } from './icon';

if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

const clampScale = (n: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(n * 100) / 100));

const clampPage = (next: number, total: number): number => {
  if (total <= 0) return 1;
  return Math.min(total, Math.max(1, next));
};

interface PdfViewerProps {
  blob: Blob;
  name: string;
  mode: 'thumbnail' | 'pane';
  pageCount?: number;
  className?: string;
}

interface PdfFile {
  data: Uint8Array;
}

interface PdfSource {
  buffer: ArrayBuffer;
  // A stable id per source so react-pdf can be keyed and recreate the Document
  // when the underlying blob changes.
  id: number;
}

let pdfSourceCounter = 0;

// Read the blob into in-memory bytes once and serve a fresh Uint8Array each
// time we hand react-pdf a `file` prop. The Blob path goes via a blob: URL
// that the production CSP (connect-src 'self' https:) blocks, so we read the
// bytes ourselves. pdfjs *transfers* and takes ownership of any TypedArray
// passed in, which detaches our buffer — so we must serve a fresh copy on
// every render that creates a Document, never the same instance twice.
const usePdfSource = (blob: Blob): PdfSource | null => {
  const [source, setSource] = useState<PdfSource | null>(null);
  useEffect(() => {
    let cancelled = false;
    setSource(null);
    void blob.arrayBuffer().then((buffer) => {
      if (!cancelled) {
        pdfSourceCounter += 1;
        setSource({ buffer, id: pdfSourceCounter });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [blob]);
  return source;
};

const fileFromSource = (source: PdfSource): PdfFile => ({
  // Fresh Uint8Array view over a copy of the buffer — pdfjs transfers (and
  // therefore detaches) whatever it receives, so we must not share the master.
  data: new Uint8Array(source.buffer.slice(0)),
});

interface ThumbnailProps {
  source: PdfSource | null;
  onLoadSuccess: (doc: { numPages: number }) => void;
  className?: string;
}

const ThumbnailView = ({ source, onLoadSuccess, className }: ThumbnailProps) => {
  const wrapperClass = cn('flex w-full items-center justify-center', className);
  if (!source) return <div className={wrapperClass} aria-hidden />;
  return (
    <Document
      key={source.id}
      file={fileFromSource(source)}
      onLoadSuccess={onLoadSuccess}
      loading={null}
      className={wrapperClass}
      aria-hidden
    >
      <Page
        pageNumber={1}
        width={160}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
    </Document>
  );
};

interface PaneToolbarProps {
  summary: string;
  pageNumber: number;
  totalPages: number;
  scale: number;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const PaneToolbar = ({
  summary,
  pageNumber,
  totalPages,
  scale,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
}: PaneToolbarProps) => (
  <div className="flex h-8 shrink-0 items-center justify-between border-b border-rule px-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
    <span aria-live="polite" data-testid="pdf-viewer-summary" className="truncate">
      {summary}
    </span>
    <div className="flex items-center gap-1">
      <IconButton
        icon={ChevronLeft}
        iconSize="sm"
        label="Previous page"
        onClick={onPrev}
        disabled={pageNumber <= 1}
        data-testid="pdf-viewer-prev"
      />
      <IconButton
        icon={ChevronRight}
        iconSize="sm"
        label="Next page"
        onClick={onNext}
        disabled={pageNumber >= totalPages}
        data-testid="pdf-viewer-next"
      />
      <span className="px-1" aria-hidden>·</span>
      <IconButton
        icon={ZoomOut}
        iconSize="sm"
        label="Zoom out"
        onClick={onZoomOut}
        disabled={scale <= MIN_SCALE}
        data-testid="pdf-viewer-zoom-out"
      />
      <IconButton
        icon={ZoomIn}
        iconSize="sm"
        label="Zoom in"
        onClick={onZoomIn}
        disabled={scale >= MAX_SCALE}
        data-testid="pdf-viewer-zoom-in"
      />
    </div>
  </div>
);

interface PaneViewProps {
  source: PdfSource | null;
  name: string;
  onLoadSuccess: (doc: { numPages: number }) => void;
  pageNumber: number;
  totalPages: number;
  scale: number;
  setPageNumber: React.Dispatch<React.SetStateAction<number>>;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  className?: string;
}

interface PaneControls {
  goPrev: () => void;
  goNext: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const usePaneControls = (
  totalPages: number,
  setPageNumber: React.Dispatch<React.SetStateAction<number>>,
  setScale: React.Dispatch<React.SetStateAction<number>>,
): PaneControls => ({
  goPrev: () => { setPageNumber((p) => clampPage(p - 1, totalPages)); },
  goNext: () => { setPageNumber((p) => clampPage(p + 1, totalPages)); },
  zoomIn: () => { setScale((s) => clampScale(s + SCALE_STEP)); },
  zoomOut: () => { setScale((s) => clampScale(s - SCALE_STEP)); },
});

const makePaneKeyHandler =
  (ctrl: PaneControls) =>
  (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); ctrl.goPrev(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); ctrl.goNext(); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); ctrl.zoomIn(); }
    else if (e.key === '-') { e.preventDefault(); ctrl.zoomOut(); }
  };

const PaneBody = ({
  source,
  onLoadSuccess,
  pageNumber,
  totalPages,
  scale,
}: {
  source: PdfSource | null;
  onLoadSuccess: (doc: { numPages: number }) => void;
  pageNumber: number;
  totalPages: number;
  scale: number;
}) => (
  <div className="flex-1 overflow-auto bg-paper-2 p-3">
    {source ? (
      <Document
        key={source.id}
        file={fileFromSource(source)}
        onLoadSuccess={onLoadSuccess}
        loading={null}
        className="flex justify-center"
      >
        <Page
          pageNumber={clampPage(pageNumber, totalPages > 0 ? totalPages : 1)}
          scale={scale}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    ) : (
      <div
        role="status"
        className="flex justify-center font-mono text-[10px] uppercase tracking-wider text-ink-3"
      >
        loading…
      </div>
    )}
  </div>
);

const PaneView = ({
  source,
  name,
  onLoadSuccess,
  pageNumber,
  totalPages,
  scale,
  setPageNumber,
  setScale,
  className,
}: PaneViewProps) => {
  const ctrl = usePaneControls(totalPages, setPageNumber, setScale);
  const summary =
    totalPages > 0
      ? `${name} · page ${String(pageNumber)} of ${String(totalPages)}`
      : `${name} · loading`;
  return (
    <div
      role="region"
      aria-label={`PDF reader, ${name}`}
      tabIndex={0}
      onKeyDown={makePaneKeyHandler(ctrl)}
      className={cn(
        'flex h-full min-h-0 w-full flex-col bg-paper outline-none focus-visible:ring-1 focus-visible:ring-ink',
        className,
      )}
      data-testid="pdf-viewer"
    >
      <PaneToolbar
        summary={summary}
        pageNumber={pageNumber}
        totalPages={totalPages}
        scale={scale}
        onPrev={ctrl.goPrev}
        onNext={ctrl.goNext}
        onZoomIn={ctrl.zoomIn}
        onZoomOut={ctrl.zoomOut}
      />
      <PaneBody
        source={source}
        onLoadSuccess={onLoadSuccess}
        pageNumber={pageNumber}
        totalPages={totalPages}
        scale={scale}
      />
    </div>
  );
};

export const PdfViewer = ({
  blob,
  name,
  mode,
  pageCount: hintedCount,
  className,
}: PdfViewerProps) => {
  const source = usePdfSource(blob);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(hintedCount ?? 0);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setPageNumber(1);
    setTotalPages(hintedCount ?? 0);
    setScale(1);
  }, [blob, hintedCount]);

  const onLoadSuccess = useCallback((doc: { numPages: number }) => {
    setTotalPages(doc.numPages);
  }, []);

  if (mode === 'thumbnail') {
    return (
      <ThumbnailView
        source={source}
        onLoadSuccess={onLoadSuccess}
        className={className}
      />
    );
  }
  return (
    <PaneView
      source={source}
      name={name}
      onLoadSuccess={onLoadSuccess}
      pageNumber={pageNumber}
      totalPages={totalPages}
      scale={scale}
      setPageNumber={setPageNumber}
      setScale={setScale}
      className={className}
    />
  );
};

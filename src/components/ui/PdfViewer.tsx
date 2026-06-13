import { useCallback, useEffect, useMemo, useState } from 'react';
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
  data: Blob;
}

const usePdfFile = (blob: Blob): PdfFile =>
  useMemo(() => ({ data: blob }), [blob]);

interface ThumbnailProps {
  file: PdfFile;
  onLoadSuccess: (doc: { numPages: number }) => void;
  className?: string;
}

const ThumbnailView = ({ file, onLoadSuccess, className }: ThumbnailProps) => (
  <Document
    file={file}
    onLoadSuccess={onLoadSuccess}
    loading={null}
    className={cn('flex w-full items-center justify-center', className)}
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
  file: PdfFile;
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
  file,
  onLoadSuccess,
  pageNumber,
  totalPages,
  scale,
}: {
  file: PdfFile;
  onLoadSuccess: (doc: { numPages: number }) => void;
  pageNumber: number;
  totalPages: number;
  scale: number;
}) => (
  <div className="flex-1 overflow-auto bg-paper-2 p-3">
    <Document
      file={file}
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
  </div>
);

const PaneView = ({
  file,
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
        file={file}
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
  const file = usePdfFile(blob);
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
        file={file}
        onLoadSuccess={onLoadSuccess}
        className={className}
      />
    );
  }
  return (
    <PaneView
      file={file}
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

import { MIN_SCALE, MAX_SCALE, type PdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import { PdfPager } from '@/components/pdf/reader/PdfPager';
import { PdfZoomControl } from '@/components/pdf/reader/PdfZoomControl';
import { MediaViewerPdf } from './MediaViewerPdf';
import type { MediaItem } from '@/db/schema';

interface PdfReaderPageAreaProps {
  spaceId: string;
  item: MediaItem;
  view: PdfViewport;
}

/**
 * The page column: the rendered PDF and its in-view floating chrome — the quiet
 * pager and the zoom cluster, each shown only once the page count is known. Kept
 * apart from `PdfReaderSurface` so the surface owns the page/panel/rail layout
 * and this owns the viewport and its overlays.
 */
export const PdfReaderPageArea = ({ spaceId, item, view }: PdfReaderPageAreaProps) => (
  <div className="relative min-w-0 flex-1">
    <MediaViewerPdf
      mediaId={item.id}
      spaceId={spaceId}
      blob={item.blob}
      title={item.name}
      page={view.pageNumber}
      scale={view.scale}
      onPageChange={view.goToPage}
      onNumPagesChange={view.setNumPages}
    />
    {view.numPages > 0 && (
      <PdfPager
        pageNumber={view.pageNumber}
        numPages={view.numPages}
        onPrev={view.prev}
        onNext={view.next}
      />
    )}
    {view.numPages > 0 && (
      <PdfZoomControl
        scale={view.scale}
        canZoomIn={view.scale < MAX_SCALE}
        canZoomOut={view.scale > MIN_SCALE}
        onZoomIn={view.zoomIn}
        onZoomOut={view.zoomOut}
        onResetZoom={view.resetZoom}
      />
    )}
  </div>
);

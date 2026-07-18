import { useUI, DEFAULT_PDF_READER_PREF, type PdfReaderPanel } from '@/store/ui';
import { usePdfAnnotations } from '@/hooks/usePdfAnnotations';
import { MIN_SCALE, MAX_SCALE, type PdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import { PdfReaderRail } from '@/components/pdf/reader/PdfReaderRail';
import { PdfReaderPanelHost } from '@/components/pdf/reader/PdfReaderPanelHost';
import { PdfReaderOverflowMenu } from '@/components/pdf/reader/PdfReaderOverflowMenu';
import { PdfThumbRail } from '@/components/pdf/reader/PdfThumbRail';
import { PdfReaderPageArea } from './PdfReaderPageArea';
import type { MediaItem } from '@/db/schema';

interface PdfReaderSurfaceProps {
  spaceId: string;
  item: MediaItem;
  view: PdfViewport;
  /** Focus mode hides the thumbnail column, side panel and glyph rail. */
  focused?: boolean;
}

/**
 * The reader body: the page area with its quiet pager on the left, then — unless
 * the rail is hidden — the active side panel and the glyph rail. Reads the
 * per-document chrome memory from the store and drives the lifted viewport. In
 * focus mode every piece of side chrome folds away so the page owns the room.
 */
export const PdfReaderSurface = ({ spaceId, item, view, focused = false }: PdfReaderSurfaceProps) => {
  const pref = useUI((s) => s.pdfReaderPrefs[item.id] ?? DEFAULT_PDF_READER_PREF);
  const setPref = useUI((s) => s.setPdfReaderPref);
  const annotations = usePdfAnnotations(item.id);
  const showThumbs = pref.thumbs && !focused;
  const showRail = !pref.railHidden && !focused;

  return (
    <div className="flex min-h-0 flex-1 bg-paper">
      {showThumbs && (
        <PdfThumbRail
          blob={item.blob}
          numPages={view.numPages}
          activePage={view.pageNumber}
          annotations={annotations}
          onPageChange={view.goToPage}
          onPrev={view.prev}
          onNext={view.next}
        />
      )}
      <PdfReaderPageArea spaceId={spaceId} item={item} view={view} showPager={!showThumbs} />
      {showRail && (
        <PdfReaderPanelHost
          panel={pref.panel}
          item={item}
          annotationCount={annotations.length}
          onNavigateToPage={view.goToPage}
        />
      )}
      {showRail && (
        <PdfReaderRail
          panel={pref.panel}
          annotations={annotations}
          numPages={view.numPages}
          onPanelChange={(panel: PdfReaderPanel) => {
            setPref(item.id, { panel });
          }}
          onNavigateToPage={view.goToPage}
          overflowSlot={
            <PdfReaderOverflowMenu
              spaceId={spaceId}
              canZoomIn={view.scale < MAX_SCALE}
              canZoomOut={view.scale > MIN_SCALE}
              onZoomIn={view.zoomIn}
              onZoomOut={view.zoomOut}
              onResetZoom={view.resetZoom}
            />
          }
        />
      )}
    </div>
  );
};

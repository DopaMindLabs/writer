import { useUI, DEFAULT_PDF_READER_PREF, type PdfReaderPanel } from '@/store/ui';
import { usePdfAnnotations } from '@/hooks/usePdfAnnotations';
import { MIN_SCALE, MAX_SCALE, type PdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import { PdfReaderRail } from '@/components/pdf/reader/PdfReaderRail';
import { PdfReaderPanelHost } from '@/components/pdf/reader/PdfReaderPanelHost';
import { PdfReaderOverflowMenu } from '@/components/pdf/reader/PdfReaderOverflowMenu';
import { PdfReaderPageArea } from './PdfReaderPageArea';
import type { MediaItem } from '@/db/schema';

interface PdfReaderSurfaceProps {
  spaceId: string;
  item: MediaItem;
  view: PdfViewport;
}

/**
 * The reader body: the page area with its quiet pager on the left, then — unless
 * the rail is hidden — the active side panel and the glyph rail. Reads the
 * per-document chrome memory from the store and drives the lifted viewport.
 */
export const PdfReaderSurface = ({ spaceId, item, view }: PdfReaderSurfaceProps) => {
  const pref = useUI((s) => s.pdfReaderPrefs[item.id] ?? DEFAULT_PDF_READER_PREF);
  const setPref = useUI((s) => s.setPdfReaderPref);
  const annotations = usePdfAnnotations(item.id);

  return (
    <div className="flex min-h-0 flex-1 bg-paper">
      {/* [thumbnail column — PG.3] */}
      <PdfReaderPageArea spaceId={spaceId} item={item} view={view} />
      {!pref.railHidden && (
        <PdfReaderPanelHost
          panel={pref.panel}
          item={item}
          annotationCount={annotations.length}
          onNavigateToPage={view.goToPage}
        />
      )}
      {!pref.railHidden && (
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

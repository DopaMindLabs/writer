import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PdfViewer } from '@/components/pdf/PdfViewer/PdfViewer';
import { AnnotationLayer, useTextSelection, type AnnotatorAnnotation } from '@/pdf-annotator';
import { PdfSelectionStrip } from '@/components/pdf/highlights/PdfSelectionStrip';
import { usePdfAnnotator } from '@/hooks/usePdfAnnotator';
import { getPdfMarkLabel } from '@/lib/pdf/pdfMarkLabel';

interface MediaViewerPdfProps {
  mediaId: string;
  spaceId: string;
  blob: Blob;
  title: string;
}

/**
 * The annotated PDF surface: the decomposed viewer with the highlight layer and
 * the selection strip mounted through its per-page overlay slot. Text selection
 * inside the viewer stashes a capture; the strip renders over the captured page
 * until an action or a dismissal clears it. Kept apart from `MediaViewerContent`
 * (which owns the back link and the empty states) so each changes for one reason.
 */
export const MediaViewerPdf = ({ mediaId, spaceId, blob, title }: MediaViewerPdfProps) => {
  const { t } = useTranslation('screens');
  const containerRef = useRef<HTMLDivElement>(null);
  const pageEls = useRef(new Map<number, HTMLElement>());
  const annotator = usePdfAnnotator({ mediaId, spaceId });

  useTextSelection({ containerRef, onCapture: annotator.handleCapture });

  const onPageElement = useCallback((page: number, el: HTMLElement | null): void => {
    if (el) pageEls.current.set(page, el);
    else pageEls.current.delete(page);
  }, []);

  const getMarkLabel = useCallback(
    (annotation: AnnotatorAnnotation): string =>
      getPdfMarkLabel((key, options) => t(key, options), annotation),
    [t],
  );

  const { capture } = annotator;

  return (
    <div ref={containerRef} className="h-full">
      <PdfViewer
        blob={blob}
        title={title}
        onPageElement={onPageElement}
        pageOverlay={(page) => {
          const stripPageEl = capture ? pageEls.current.get(capture.page) : undefined;
          return (
            <>
              <AnnotationLayer
                annotations={annotator.annotations}
                page={page}
                getMarkLabel={getMarkLabel}
              />
              {capture?.page === page && stripPageEl ? (
                <PdfSelectionStrip capture={capture} pageEl={stripPageEl} annotator={annotator} />
              ) : null}
            </>
          );
        }}
      />
    </div>
  );
};

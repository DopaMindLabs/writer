import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/lib/pdf/pdfAdapter';

interface PdfPageViewProps {
  page: number;
  numPages: number;
  scale: number;
  pageOverlay?: (page: number) => ReactNode;
  onPageElement?: (page: number, el: HTMLElement | null) => void;
}

/**
 * One rendered page: the text layer stays on (real, selectable text — the basis
 * for highlighting) and react-pdf's annotation layer is off. Only a single page
 * is mounted at a time — bounded memory, simple geometry, and the highlight
 * overlay only ever measures the page in view. The wrapper ref is reported so a
 * highlight layer can project onto the exact page box; the overlay slot sits
 * over the canvas, pointer-transparent so text selection reaches the text layer.
 *
 * The slot itself carries no `z-index`: highlight tints must stay in the page's
 * own stacking context so their `mix-blend-multiply` blends against the canvas
 * glyphs (a `z-index` here would isolate them and paint the tints solid). Only
 * the invisible interactive pieces lift above pdf.js's text layer (`z-index: 2`)
 * — the mark buttons do so themselves. `group/pdfpage` lets those buttons go
 * pointer-transparent while pdf.js is mid-selection (`.textLayer.selecting`) so a
 * drag crosses an existing highlight instead of being swallowed by it.
 */
export const PdfPageView = ({
  page,
  numPages,
  scale,
  pageOverlay,
  onPageElement,
}: PdfPageViewProps) => {
  const { t } = useTranslation('screens');

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      onPageElement?.(page, el);
    },
    [onPageElement, page],
  );

  return (
    <div
      ref={setRef}
      data-testid="pdf-page"
      data-page-number={page}
      role="group"
      aria-label={t('mediaLibrary.viewer.pageLabel', { page, total: numPages })}
      className="group/pdfpage relative mx-auto w-fit"
    >
      <Page
        pageNumber={page}
        scale={scale}
        renderTextLayer
        renderAnnotationLayer={false}
      />
      {pageOverlay ? (
        <div className="pointer-events-none absolute inset-0" data-testid="pdf-page-overlay">
          {pageOverlay(page)}
        </div>
      ) : null}
    </div>
  );
};

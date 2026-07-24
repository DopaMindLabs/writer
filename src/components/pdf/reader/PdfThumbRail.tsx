import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePdfThumbnails } from '@/hooks/usePdfThumbnails';
import { PdfThumb } from './PdfThumb';
import { PdfThumbPager } from './PdfThumbPager';
import { useThumbVisibility } from './useThumbVisibility';
import type { PdfAnnotation } from '@/db/schema';
import type { HighlightColor } from '@/theme/tokens';

interface PdfThumbRailProps {
  blob: Blob;
  numPages: number;
  activePage: number;
  annotations: PdfAnnotation[];
  onPageChange: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

// Thumbnails render small; 64px is enough to read the page shape without paying
// full-resolution render cost.
const THUMB_RENDER_WIDTH = 64;
// A thumbnail shows at most four colour ticks, mirroring the palette's size.
const TICK_CAP = 4;

/** Distinct highlight colours per page, in document order, capped per thumbnail. */
const colorsByPage = (
  annotations: PdfAnnotation[],
): Record<number, HighlightColor[]> => {
  const out: Record<number, HighlightColor[]> = {};
  for (const annotation of annotations) {
    const list = (out[annotation.page] ??= []);
    if (list.length < TICK_CAP && !list.includes(annotation.color)) {
      list.push(annotation.color);
    }
  }
  return out;
};

/**
 * The 112px thumbnail column: a scrollable strip of page thumbnails (rendered
 * lazily as each scrolls into view), highlight ticks per page, and a docked foot
 * pager. Its own scroll box is the observer root, so only visible pages render.
 */
export const PdfThumbRail = ({
  blob,
  numPages,
  activePage,
  annotations,
  onPageChange,
  onPrev,
  onNext,
}: PdfThumbRailProps) => {
  const { t } = useTranslation('screens');
  const { thumbs, requestPage } = usePdfThumbnails(blob, { width: THUMB_RENDER_WIDTH });
  const { rootRef, register } = useThumbVisibility(requestPage);
  const colors = useMemo(() => colorsByPage(annotations), [annotations]);
  const pages = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label={t('pdfReader.thumbs.region')}
      data-testid="pdf-thumb-rail"
      className="flex w-28 shrink-0 flex-col border-r border-rule bg-paper"
    >
      <div
        ref={rootRef}
        className="flex flex-1 flex-col items-center gap-3 overflow-y-auto py-3"
      >
        {pages.map((page) => (
          <PdfThumb
            key={page}
            page={page}
            active={page === activePage}
            src={thumbs[page]}
            colors={colors[page] ?? []}
            onSelect={onPageChange}
            innerRef={(el) => { register(page, el); }}
          />
        ))}
      </div>
      <PdfThumbPager
        pageNumber={activePage}
        numPages={numPages}
        onPrev={onPrev}
        onNext={onNext}
      />
    </nav>
  );
};

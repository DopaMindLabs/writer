import { PdfHighlightMark } from './PdfHighlightMark';
import type { PdfAnnotation } from '@/db/schema';

interface PdfHighlightLayerProps {
  annotations: PdfAnnotation[];
  page: number;
}

/**
 * The highlight overlay for one page, mounted through the viewer's `pageOverlay`
 * slot. Fills the page box; each mark positions itself as fractions of it. The
 * container stays pointer-transparent (text selection passes through); only the
 * marks' own buttons opt back into pointer events.
 */
export const PdfHighlightLayer = ({ annotations, page }: PdfHighlightLayerProps) => (
  <div data-testid="pdf-highlight-layer" className="absolute inset-0">
    {annotations
      .filter((annotation) => annotation.page === page)
      .map((annotation) => (
        <PdfHighlightMark key={annotation.id} annotation={annotation} />
      ))}
  </div>
);

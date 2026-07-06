import { AnnotationMark } from './AnnotationMark';
import type { AnnotatorAnnotation } from '../core/types';

interface AnnotationLayerProps {
  annotations: AnnotatorAnnotation[];
  page: number;
  /** Builds each mark's accessible name; threaded to every mark so the module
   * stays free of i18n. */
  getMarkLabel: (annotation: AnnotatorAnnotation) => string;
}

/**
 * The annotation overlay for one page, mounted through the viewer's `pageOverlay`
 * slot. Fills the page box; each mark positions itself as fractions of it. The
 * container stays pointer-transparent (text selection passes through); only the
 * marks' own buttons opt back into pointer events.
 */
export const AnnotationLayer = ({ annotations, page, getMarkLabel }: AnnotationLayerProps) => (
  <div data-testid="pdf-highlight-layer" className="absolute inset-0">
    {annotations
      .filter((annotation) => annotation.page === page)
      .map((annotation) => (
        <AnnotationMark key={annotation.id} annotation={annotation} getMarkLabel={getMarkLabel} />
      ))}
  </div>
);

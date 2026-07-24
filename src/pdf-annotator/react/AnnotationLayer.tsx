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
 *
 * `isolate` + `mix-blend-multiply` make the whole layer a single blend group: the
 * marks composite among themselves normally (a later mark simply paints over an
 * earlier one — no compounding, so overlapping tints never darken into a "double
 * highlight"), and the group as a whole multiplies once against the page canvas
 * so the text stays legible through every tint.
 */
export const AnnotationLayer = ({ annotations, page, getMarkLabel }: AnnotationLayerProps) => (
  <div data-testid="pdf-highlight-layer" className="absolute inset-0 isolate mix-blend-multiply">
    {annotations
      .filter((annotation) => annotation.page === page)
      .map((annotation) => (
        <AnnotationMark key={annotation.id} annotation={annotation} getMarkLabel={getMarkLabel} />
      ))}
  </div>
);

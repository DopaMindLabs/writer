import { clsx } from 'clsx';
import { swatchRecipe, type SwatchVariants } from './swatchRecipe';
import type { AnnotatorAnnotation, PdfRect } from '../core/types';

const pct = (n: number): string => `${(n * 100).toString()}%`;

const unionBox = (rects: PdfRect[]): PdfRect => {
  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
};

interface AnnotationMarkProps {
  annotation: AnnotatorAnnotation;
  /** Builds the mark's accessible name; supplied by the host so the module
   * stays free of i18n. */
  getMarkLabel: (annotation: AnnotatorAnnotation) => string;
}

/**
 * One highlight: a tinted, pointer-transparent `<span>` per rect (positioned as
 * fractions of the page box, so it re-projects at any zoom), plus a single
 * invisible, pointer-interactive button over the union box carrying the id,
 * colour and an accessible name for the context menu and the panel to target.
 */
export const AnnotationMark = ({ annotation, getMarkLabel }: AnnotationMarkProps) => {
  const box = unionBox(annotation.rects);

  return (
    <>
      {annotation.rects.map((rect, i) => (
        <span
          key={`${annotation.id}-${i.toString()}`}
          aria-hidden="true"
          className={clsx(
            'absolute mix-blend-multiply',
            swatchRecipe({ color: annotation.color as SwatchVariants['color'] }),
          )}
          style={{ left: pct(rect.x), top: pct(rect.y), width: pct(rect.w), height: pct(rect.h) }}
        />
      ))}
      <button
        type="button"
        aria-label={getMarkLabel(annotation)}
        data-testid="pdf-highlight-mark"
        data-highlight-id={annotation.id}
        data-color={annotation.color}
        className="pointer-events-auto absolute h-auto min-h-0 border-0 bg-transparent p-0"
        style={{ left: pct(box.x), top: pct(box.y), width: pct(box.w), height: pct(box.h) }}
      />
    </>
  );
};

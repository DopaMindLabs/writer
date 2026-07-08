import { clsx } from 'clsx';
import { swatchRecipe, type SwatchVariants } from './swatchRecipe';
import type { AnnotationKind, AnnotatorAnnotation, PdfRect } from '../core/types';
import type { CSSProperties } from 'react';

const pct = (n: number): string => `${(n * 100).toString()}%`;

const unionBox = (rects: PdfRect[]): PdfRect => {
  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
};

/** The tint span geometry for one rect, by kind. Underline sits on the rect's
 * bottom edge and strikethrough on its vertical centre — both 2px bars — while
 * a highlight fills the whole rect. */
const rectStyle = (kind: AnnotationKind, rect: PdfRect): CSSProperties => {
  const base = { left: pct(rect.x), width: pct(rect.w) };
  if (kind === 'underline') {
    return { ...base, top: `calc(${pct(rect.y + rect.h)} - 2px)`, height: '2px' };
  }
  if (kind === 'strikethrough') {
    return { ...base, top: `calc(${pct(rect.y + rect.h / 2)} - 1px)`, height: '2px' };
  }
  return { ...base, top: pct(rect.y), height: pct(rect.h) };
};

interface AnnotationMarkProps {
  annotation: AnnotatorAnnotation;
  /** Builds the mark's accessible name; supplied by the host so the module
   * stays free of i18n. */
  getMarkLabel: (annotation: AnnotatorAnnotation) => string;
}

/**
 * One mark: a tinted, pointer-transparent `<span>` per rect (positioned as
 * fractions of the page box, so it re-projects at any zoom), plus a single
 * invisible, pointer-interactive button over the union box carrying the id,
 * kind, colour and an accessible name for the context menu and the panel to
 * target. A highlight fills each rect (`mix-blend-multiply`); underline and
 * strikethrough draw a solid 2px bar.
 *
 * The tint spans carry no `z-index` so the multiply blends against the canvas
 * glyphs beneath. Only the button lifts above pdf.js's text layer (`z-index: 2`)
 * so a right-click lands on the mark — but it turns pointer-transparent while a
 * selection drag is in flight (`group-has-[.textLayer.selecting]`) so dragging a
 * new selection across an existing highlight extends it instead of being
 * swallowed by the button.
 */
export const AnnotationMark = ({ annotation, getMarkLabel }: AnnotationMarkProps) => {
  const box = unionBox(annotation.rects);
  const swatch = swatchRecipe({ color: annotation.color as SwatchVariants['color'] });
  const blend = annotation.kind === 'highlight' ? 'mix-blend-multiply' : undefined;

  return (
    <>
      {annotation.rects.map((rect, i) => (
        <span
          key={`${annotation.id}-${i.toString()}`}
          aria-hidden="true"
          className={clsx('absolute', blend, swatch)}
          style={rectStyle(annotation.kind, rect)}
        />
      ))}
      <button
        type="button"
        aria-label={getMarkLabel(annotation)}
        data-testid="pdf-highlight-mark"
        data-highlight-id={annotation.id}
        data-kind={annotation.kind}
        data-color={annotation.color}
        className="pointer-events-auto absolute z-10 h-auto min-h-0 border-0 bg-transparent p-0 group-has-[.textLayer.selecting]/pdfpage:pointer-events-none"
        style={{ left: pct(box.x), top: pct(box.y), width: pct(box.w), height: pct(box.h) }}
      />
    </>
  );
};

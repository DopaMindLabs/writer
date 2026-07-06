import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { highlightSwatchRecipe } from './highlightSwatch.recipe';
import type { PdfAnnotation, PdfRect } from '@/db/schema';

const pct = (n: number): string => `${(n * 100).toString()}%`;

const unionBox = (rects: PdfRect[]): PdfRect => {
  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
};

interface PdfHighlightMarkProps {
  annotation: PdfAnnotation;
}

/**
 * One highlight: a tinted, pointer-transparent `<span>` per rect (positioned as
 * fractions of the page box, so it re-projects at any zoom), plus a single
 * invisible, pointer-interactive button over the union box carrying the id,
 * colour and an accessible name for the context menu and the sidebar to target.
 */
export const PdfHighlightMark = ({ annotation }: PdfHighlightMarkProps) => {
  const { t } = useTranslation('screens');
  const box = unionBox(annotation.rects);
  const colorName = t(`pdfHighlight.colors.${annotation.color}`);
  const label = t('pdfHighlight.markAria', {
    color: colorName,
    quote: annotation.quote.slice(0, 80),
  });

  return (
    <>
      {annotation.rects.map((rect, i) => (
        <span
          key={`${annotation.id}-${i.toString()}`}
          aria-hidden="true"
          className={cn(
            'absolute mix-blend-multiply',
            highlightSwatchRecipe({ color: annotation.color }),
          )}
          style={{ left: pct(rect.x), top: pct(rect.y), width: pct(rect.w), height: pct(rect.h) }}
        />
      ))}
      <Button
        kind="ghost"
        aria-label={label}
        data-testid="pdf-highlight-mark"
        data-highlight-id={annotation.id}
        data-color={annotation.color}
        className="pointer-events-auto absolute h-auto min-h-0 border-0 bg-transparent p-0"
        style={{ left: pct(box.x), top: pct(box.y), width: pct(box.w), height: pct(box.h) }}
      />
    </>
  );
};

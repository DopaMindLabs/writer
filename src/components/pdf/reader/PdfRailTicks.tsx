import { useTranslation } from 'react-i18next';
import { swatchRecipe } from '@/pdf-annotator';
import { cn } from '@/lib/utils';
import type { PdfAnnotation } from '@/db/schema';

interface PdfRailTicksProps {
  annotations: PdfAnnotation[];
  numPages: number;
  onNavigateToPage: (page: number) => void;
}

// The design shows a handful of ticks; a 600-highlight document must not paint a
// wall, so only the first 40 (document order) are drawn.
const TICK_CAP = 40;

/**
 * Highlight ticks laid down the rail's left hairline, each positioned in
 * proportion to where its mark sits in the whole document. Activating a tick
 * moves the reader to that page. Shown only while no side panel is open.
 */
export const PdfRailTicks = ({
  annotations,
  numPages,
  onNavigateToPage,
}: PdfRailTicksProps) => {
  const { t } = useTranslation('screens');
  const pages = Math.max(numPages, 1);

  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 w-[9px]">
      {annotations.slice(0, TICK_CAP).map((annotation) => {
        const top = ((annotation.page - 1 + annotation.rects[0].y) / pages) * 100;
        return (
          <button
            key={annotation.id}
            type="button"
            data-testid="pdf-rail-tick"
            aria-label={t('pdfReader.tick', { page: annotation.page })}
            onClick={() => {
              onNavigateToPage(annotation.page);
            }}
            style={{ top: `${String(top)}%` }}
            className={cn(
              'pointer-events-auto absolute left-0 h-4 w-[9px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink',
              swatchRecipe({ color: annotation.color }),
            )}
          />
        );
      })}
    </div>
  );
};

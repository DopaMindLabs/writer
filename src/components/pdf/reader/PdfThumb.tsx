import { useTranslation } from 'react-i18next';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { swatchRecipe } from '@/pdf-annotator';
import { cn } from '@/lib/utils';
import type { HighlightColor } from '@/theme/tokens';

interface PdfThumbProps {
  page: number;
  active: boolean;
  /** The rendered PNG data URL, or `undefined` while the page is still resolving. */
  src?: string;
  /** Distinct highlight colours on this page, document order, already capped. */
  colors: HighlightColor[];
  onSelect: (page: number) => void;
  /** Registers the button with the rail's IntersectionObserver for lazy loading. */
  innerRef?: (el: HTMLElement | null) => void;
}

/**
 * One page thumbnail: its rendered image (or a paper skeleton until it resolves),
 * a colour tick per distinct highlight on the page, and the page number below.
 * The active page carries a heavier ink border, an ink number, and `aria-current`.
 */
export const PdfThumb = ({
  page,
  active,
  src,
  colors,
  onSelect,
  innerRef,
}: PdfThumbProps) => {
  const { t } = useTranslation('screens');

  return (
    <button
      ref={innerRef}
      type="button"
      data-testid={`pdf-thumb-${String(page)}`}
      data-page={page}
      aria-label={t('pdfReader.thumbs.page', { page })}
      aria-current={active ? 'page' : undefined}
      onClick={() => { onSelect(page); }}
      className="flex flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
    >
      <div
        className={cn(
          'relative h-[84px] w-16 overflow-hidden border bg-paper',
          active ? 'border-[1.5px] border-ink' : 'border-rule',
        )}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-contain" />
        ) : (
          <div data-testid="pdf-thumb-skeleton" className="h-full w-full bg-paper-2" />
        )}
        {colors.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col">
            {colors.map((color) => (
              <span
                key={color}
                data-testid="pdf-thumb-tick"
                className={cn('h-[2px] w-full', swatchRecipe({ color }))}
              />
            ))}
          </div>
        )}
      </div>
      <Eyebrow size={9} className={cn(active ? 'text-ink' : 'text-ink-3')}>
        {page}
      </Eyebrow>
    </button>
  );
};

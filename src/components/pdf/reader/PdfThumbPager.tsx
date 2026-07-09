import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/icon';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { ChevronLeft, ChevronRight } from '@/components/libs/icons';

interface PdfThumbPagerProps {
  pageNumber: number;
  numPages: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * The thumbnail column's docked foot pager: the same mono `n / m` grammar as the
 * floating {@link PdfPager}, but seated on a hairline under the thumbs rather than
 * floating over the page — the centre pager hides while the column is open.
 */
export const PdfThumbPager = ({
  pageNumber,
  numPages,
  onPrev,
  onNext,
}: PdfThumbPagerProps) => {
  const { t } = useTranslation('screens');

  return (
    <div
      data-testid="pdf-thumb-pager"
      className="flex items-center justify-center gap-1 border-t border-rule px-1 py-1"
    >
      <IconButton
        icon={ChevronLeft}
        label={t('mediaLibrary.viewer.prevPage')}
        data-testid="pdf-thumb-pager-prev"
        onClick={onPrev}
        disabled={pageNumber <= 1}
      />
      <Eyebrow
        aria-live="polite"
        aria-label={t('mediaLibrary.viewer.pageReadout', {
          page: pageNumber,
          total: numPages,
        })}
        className="px-1"
      >
        {pageNumber} / {numPages}
      </Eyebrow>
      <IconButton
        icon={ChevronRight}
        label={t('mediaLibrary.viewer.nextPage')}
        data-testid="pdf-thumb-pager-next"
        onClick={onNext}
        disabled={pageNumber >= numPages}
      />
    </div>
  );
};

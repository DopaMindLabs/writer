import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/icon';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { ChevronLeft, ChevronRight } from '@/components/libs/icons';

interface PdfPagerProps {
  pageNumber: number;
  numPages: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * The quiet page pager: a mono `n / m` readout flanked by prev/next, centred at
 * the bottom of the (relatively positioned) viewer container. Replaces the
 * standing toolbar's page controls — no zoom, no chrome; navigation only.
 */
export const PdfPager = ({ pageNumber, numPages, onPrev, onNext }: PdfPagerProps) => {
  const { t } = useTranslation('screens');

  return (
    <div
      data-testid="pdf-pager"
      className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-sm border border-rule bg-paper px-1 py-0.5 shadow-sm"
    >
      <IconButton
        icon={ChevronLeft}
        label={t('mediaLibrary.viewer.prevPage')}
        data-testid="pdf-pager-prev"
        onClick={onPrev}
        disabled={pageNumber <= 1}
      />
      <Eyebrow
        aria-live="polite"
        aria-label={t('mediaLibrary.viewer.pageReadout', { page: pageNumber, total: numPages })}
        className="px-1"
      >
        {pageNumber} / {numPages}
      </Eyebrow>
      <IconButton
        icon={ChevronRight}
        label={t('mediaLibrary.viewer.nextPage')}
        data-testid="pdf-pager-next"
        onClick={onNext}
        disabled={pageNumber >= numPages}
      />
    </div>
  );
};

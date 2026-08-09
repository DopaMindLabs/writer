import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

interface NotebookPageControlsProps {
  readonly pageNumber: number;
  readonly totalPages: number;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}

export const NotebookPageControls = ({
  pageNumber,
  totalPages,
  onPrevious,
  onNext,
}: NotebookPageControlsProps) => {
  const { t } = useTranslation('screens');
  return (
    <div className="flex items-center gap-2">
      <Button kind="secondary" size="sm" aria-label={t('notebook.previousPage')} disabled={pageNumber <= 1} onClick={onPrevious}>←</Button>
      <span className="font-mono text-[10px] text-ink-3">{t('notebook.pagePosition', { current: pageNumber, total: totalPages })}</span>
      <Button kind="secondary" size="sm" aria-label={t('notebook.nextPage')} disabled={pageNumber >= totalPages} onClick={onNext}>→</Button>
    </div>
  );
};

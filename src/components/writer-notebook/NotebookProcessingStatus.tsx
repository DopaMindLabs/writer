import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';

interface NotebookProcessingStatusProps {
  readonly processing: boolean;
  readonly error: string | null;
}

export const NotebookProcessingStatus = ({ processing, error }: NotebookProcessingStatusProps) => {
  const { t } = useTranslation('screens');
  if (error) {
    return <InlineBanner kind="error" title={t('notebook.importError')}>{error}</InlineBanner>;
  }
  return processing ? <InlineBanner kind="info">{t('notebook.processing')}</InlineBanner> : null;
};

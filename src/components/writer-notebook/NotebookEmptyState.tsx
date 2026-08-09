import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';

export const NotebookEmptyState = () => {
  const { t } = useTranslation('screens');
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState title={t('notebook.emptyTitle')} caption={t('notebook.emptyBody')} />
    </div>
  );
};

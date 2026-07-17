import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { setDocStatus } from '@/lib/docs';
import type { Doc } from '@/db/schema';

/**
 * The persistent notice shown above a locked (completed) document's editor,
 * offering a single action to unlock it by returning its status to draft.
 */
export const LockBanner = ({ doc }: { doc: Doc }) => {
  const { t } = useTranslation('chrome');
  return (
    <InlineBanner
      kind="warning"
      title={t('inspector.lock.title')}
      action={t('inspector.lock.unlock')}
      onAction={() => {
        void setDocStatus(doc.id, 'draft');
      }}
      className="mb-6"
      data-testid="doc-lock-banner"
    >
      {t('inspector.lock.body')}
    </InlineBanner>
  );
};

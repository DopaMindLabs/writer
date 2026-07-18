import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';

/**
 * The assertive notice shown when a document's CRDT could not be reconciled for
 * editing. The editor stays unmounted behind it; the retry re-runs the gate. No
 * error detail is rendered, so nothing sensitive reaches the surface.
 */
export const CrdtMountErrorBanner = ({ onRetry }: { onRetry: () => void }) => {
  const { t } = useTranslation('screens');
  return (
    <InlineBanner
      kind="error"
      role="alert"
      title={t('editor.crdtErrorTitle')}
      action={t('editor.crdtErrorRetry')}
      onAction={onRetry}
      className="mb-6"
      data-testid="crdt-mount-error"
    >
      {t('editor.crdtErrorBody')}
    </InlineBanner>
  );
};

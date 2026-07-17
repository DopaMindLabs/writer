import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';

/**
 * The persistent, assertive notice shown when a device reset fails, with a retry
 * action. Rendered by {@link CloudKeyErrorScreen}.
 */
export const CloudResetErrorBanner = ({ onRetry }: { onRetry: () => void }) => {
  const { t } = useTranslation('app');
  return (
    <InlineBanner
      kind="error"
      role="alert"
      title={t('cloudKeyErrorResetFailedTitle')}
      action={t('cloudKeyErrorResetRetry')}
      onAction={onRetry}
      className="mt-3"
    >
      {t('cloudKeyErrorResetFailedBody')}
    </InlineBanner>
  );
};

import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { useReconcileStatus } from '@/hooks/useReconcileStatus';
import { requestReconcile } from '@/lib/cloud/reconcile';

/**
 * Surfaces a *failed* document reconcile so the user sees an actionable error
 * rather than silently stale content, with a Retry that drives the same
 * single-flight reconcile path as the automatic triggers. Renders nothing while
 * reconciliation is idle, running, or succeeded — healthy sync stays quiet.
 */
export const CloudReconcileStatusRow = () => {
  const { t } = useTranslation('screens');
  const status = useReconcileStatus();
  if (status.state !== 'failed') return null;
  return (
    <InlineBanner
      kind="error"
      className="mt-2"
      data-testid="cloud-reconcile-error"
      title={t('settings.account.cloud.reconcile.failedTitle')}
      action={t('settings.account.cloud.reconcile.retry')}
      onAction={() => {
        requestReconcile('manual');
      }}
    >
      {t('settings.account.cloud.reconcile.failedBody')}
    </InlineBanner>
  );
};

import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';
import { usePwaUpdate } from '@/hooks/usePwaUpdate';

/**
 * Global notice shown once a new app build is downloaded and waiting. Nothing
 * is applied behind the writer's back (`registerType: 'prompt'`): the banner's
 * reload action is the only path that activates the waiting service worker,
 * and it reloads just this tab.
 */
export const PwaUpdateBanner = () => {
  const { t } = useTranslation('chrome');
  const { updateReady, applyUpdate } = usePwaUpdate();

  if (!updateReady) return null;
  return (
    <InlineBanner
      data-testid="pwa-update-banner"
      kind="info"
      title={t('pwaUpdate.title')}
      action={t('pwaUpdate.action')}
      onAction={applyUpdate}
    >
      {t('pwaUpdate.body')}
    </InlineBanner>
  );
};

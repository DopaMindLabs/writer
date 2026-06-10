import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineBanner } from '@/components/ui/InlineBanner';

// Shown in the Sync tabs when the browser exposes no File System Access API.
// Some Chromium browsers (e.g. Brave) ship the API behind a feature flag, so
// alongside the empty state we explain how to switch it on — with a warning,
// because those browsers turn it off deliberately.
export const SyncUnsupportedNotice = ({
  withTitle = false,
}: {
  withTitle?: boolean;
}) => {
  const { t } = useTranslation('screens');
  return (
    <>
      <EmptyState
        title={withTitle ? t('settings.sync.unsupportedTitle') : undefined}
        caption={t('settings.sync.unsupportedBody')}
      />
      <InlineBanner
        kind="warning"
        title={t('settings.sync.unsupportedFlagTitle')}
        className="mx-auto mt-4 max-w-md"
      >
        <p>{t('settings.sync.unsupportedFlagBody')}</p>
        <p className="mt-1">{t('settings.sync.unsupportedFlagWarning')}</p>
      </InlineBanner>
    </>
  );
};

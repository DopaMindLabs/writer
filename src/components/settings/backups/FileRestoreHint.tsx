import { useTranslation } from 'react-i18next';
import { InlineBanner } from '@/components/ui/InlineBanner';

/**
 * Persistent notice under the backups history pointing file-based restore at
 * the global import flow, which brings an archive back as a new space.
 */
export const FileRestoreHint = () => {
  const { t } = useTranslation('screens');
  return (
    <InlineBanner
      data-testid="space-settings-backups-file-restore-hint"
      kind="info"
      // Static instructional content, not an announcement — role="note"
      // keeps it out of the live-region the restore status announces in.
      role="note"
      className="mt-6"
      title={t('settings.space.backups.fileRestoreTitle')}
    >
      {t('settings.space.backups.fileRestoreBody')}
    </InlineBanner>
  );
};

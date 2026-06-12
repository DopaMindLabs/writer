import { useTranslation } from 'react-i18next';
import { TypographyP } from '@/components/ui/typography';

/**
 * Caption under the backups history pointing file-based restore at the
 * global import flow, which brings an archive back as a new space.
 */
export const FileRestoreHint = () => {
  const { t } = useTranslation('screens');
  return (
    <TypographyP
      data-testid="space-settings-backups-file-restore-hint"
      variant="caption"
      className="mt-4"
    >
      {t('settings.space.backups.fileRestoreHint')}
    </TypographyP>
  );
};

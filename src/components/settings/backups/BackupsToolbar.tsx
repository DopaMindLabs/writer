import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { TypographyP } from '@/components/ui/typography';
import { MAX_BACKUPS_PER_SPACE } from '@/lib/backup/createSpaceBackup';

interface BackupsToolbarProps {
  busy: boolean;
  onSnapshot: () => void;
}

export const BackupsToolbar = ({ busy, onSnapshot }: BackupsToolbarProps) => {
  const { t } = useTranslation('screens');
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
      <TypographyP variant="caption">
        {t('settings.space.backups.retentionHint', {
          count: MAX_BACKUPS_PER_SPACE,
        })}
      </TypographyP>
      <div className="flex items-center gap-4 text-[12px]">
        <Button
          data-testid="space-settings-backups-snapshot"
          size="sm"
          onClick={onSnapshot}
          disabled={busy}
        >
          {busy
            ? t('settings.space.backups.snapshotting')
            : t('settings.space.backups.snapshotNow')}
        </Button>
      </div>
    </div>
  );
};

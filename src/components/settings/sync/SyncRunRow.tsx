import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { Button } from '@/components/ui/Button';
import { TypographyP } from '@/components/ui/typography';
import { formatRelativeTime } from './syncFormat';

interface SyncRunRowProps {
  busy: boolean;
  disabled: boolean;
  idleLabel: string;
  onSync: () => void;
  lastSyncedAt?: number | null;
}

export const SyncRunRow = ({
  busy,
  disabled,
  idleLabel,
  onSync,
  lastSyncedAt,
}: SyncRunRowProps) => {
  const { t } = useTranslation('screens');
  return (
    <SettingRow
      label={t('settings.sync.syncLabel')}
      hint={t('settings.sync.pushOnlyHint')}
    >
      <div className="flex flex-col items-end gap-1">
        <Button onClick={onSync} disabled={busy || disabled}>
          {busy ? t('settings.sync.syncing') : idleLabel}
        </Button>
        {lastSyncedAt !== undefined ? (
          <TypographyP variant="caption" className="text-[12px] text-ink-3">
            {lastSyncedAt
              ? t('settings.sync.lastSynced', {
                  when: formatRelativeTime(lastSyncedAt, t),
                })
              : t('settings.sync.neverSynced')}
          </TypographyP>
        ) : null}
      </div>
    </SettingRow>
  );
};

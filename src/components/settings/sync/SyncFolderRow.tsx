import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { Button } from '@/components/ui/Button';

interface SyncFolderRowProps {
  folderName: string | null;
  hint: string;
  onChoose: () => void;
  /** When provided, the row offers change + disconnect once a folder is set
   * (the global Sync tab). Omit for the per-space tab, which only connects. */
  onDisconnect?: () => void;
}

/** The "Folder" SettingRow shared by the global and per-space Sync tabs. */
export const SyncFolderRow = ({
  folderName,
  hint,
  onChoose,
  onDisconnect,
}: SyncFolderRowProps) => {
  const { t } = useTranslation('screens');
  return (
    <SettingRow label={t('settings.sync.folderLabel')} hint={hint}>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="font-serif text-[14px] text-ink">
          {folderName ?? t('settings.sync.noFolder')}
        </span>
        {onDisconnect !== undefined || !folderName ? (
          <Button kind="secondary" size="sm" onClick={onChoose}>
            {folderName
              ? t('settings.sync.changeFolder')
              : t('settings.sync.chooseFolder')}
          </Button>
        ) : null}
        {onDisconnect && folderName ? (
          <Button kind="ghost" size="sm" onClick={onDisconnect}>
            {t('settings.sync.disconnect')}
          </Button>
        ) : null}
      </div>
    </SettingRow>
  );
};

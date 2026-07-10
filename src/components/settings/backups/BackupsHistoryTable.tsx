import { useTranslation } from 'react-i18next';
import type { Backup } from '@/db/schema';
import { isRestorableBackup } from '@/hooks/useRestoreBackup';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { EmptyState } from '@/components/ui/EmptyState';
import { TypographyLabel } from '@/components/ui/typography';

interface BackupsHistoryTableProps {
  backups: Backup[];
  onDownload: (backup: Backup) => void;
  onDelete: (backup: Backup) => void;
  onRestore?: (backup: Backup) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatRelativeTime = (
  when: number,
  t: (key: string) => string,
  now: number = Date.now(),
): string => {
  const diffSec = Math.max(0, Math.floor((now - when) / 1000));
  if (diffSec < 60) return t('settings.space.backups.justNow');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${String(diffMin)} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${String(diffHr)} h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${String(diffDay)} d ago`;
  return new Date(when).toISOString().slice(0, 10);
};

interface BackupRowProps {
  backup: Backup;
  onDownload: (backup: Backup) => void;
  onDelete: (backup: Backup) => void;
  onRestore?: (backup: Backup) => void;
}

const RestoreButton = ({ backup, onRestore }: Pick<BackupRowProps, 'backup' | 'onRestore'>) => {
  const { t } = useTranslation('screens');
  if (!onRestore) return null;
  const restorable = isRestorableBackup(backup);
  return (
    <Button
      data-testid={`backup-row-${backup.id}-restore`}
      kind="ghost"
      size="sm"
      disabled={!restorable}
      title={
        restorable ? undefined : t('settings.space.backups.restoreUnavailable')
      }
      onClick={() => {
        onRestore(backup);
      }}
    >
      {t('settings.space.backups.restore')}
    </Button>
  );
};

const BackupRow = ({ backup, onDownload, onDelete, onRestore }: BackupRowProps) => {
  const { t } = useTranslation('screens');
  return (
    <tr data-testid={`backup-row-${backup.id}`} className="border-b border-rule">
      <td className="py-2.5 font-mono text-[12px] text-ink">
        {formatRelativeTime(backup.when, t)}
      </td>
      <Eyebrow asChild size={10} tone="ink2">
        <td className="py-2.5">{t(`settings.space.backups.kind.${backup.kind}`)}</td>
      </Eyebrow>
      <td className="py-2.5 text-right font-mono text-[12px] text-ink-2">
        {formatBytes(backup.size)}
      </td>
      <td className="py-2.5 text-right">
        <div className="flex items-center justify-end gap-3 text-[12px]">
          <RestoreButton backup={backup} onRestore={onRestore} />
          <Button
            data-testid={`backup-row-${backup.id}-download`}
            kind="ghost"
            size="sm"
            onClick={() => {
              onDownload(backup);
            }}
          >
            {t('settings.space.backups.download')}
          </Button>
          <button
            data-testid={`backup-row-${backup.id}-delete`}
            type="button"
            onClick={() => {
              onDelete(backup);
            }}
            aria-label={t('settings.space.backups.delete')}
            className="text-ink-3 hover:text-ink"
          >
            {t('settings.space.backups.delete')}
          </button>
        </div>
      </td>
    </tr>
  );
};

export const BackupsHistoryTable = ({
  backups,
  onDownload,
  onDelete,
  onRestore,
}: BackupsHistoryTableProps) => {
  const { t } = useTranslation('screens');
  return (
    <div className="mt-6">
      <TypographyLabel asChild>
        <h3>{t('settings.space.backups.historyTitle')}</h3>
      </TypographyLabel>
      {backups.length === 0 ? (
        <EmptyState caption={t('settings.space.backups.empty')} />
      ) : (
        <table
          data-testid="backups-history"
          className="mt-3 w-full border-collapse text-[13px]"
        >
          <thead>
            <Eyebrow asChild size={9} tone="ink3">
              <tr className="border-b border-rule">
                <th className="py-2 text-left font-normal">
                  {t('settings.space.backups.columns.when')}
                </th>
                <th className="py-2 text-left font-normal">
                  {t('settings.space.backups.columns.kind')}
                </th>
                <th className="py-2 text-right font-normal">
                  {t('settings.space.backups.columns.size')}
                </th>
                <th className="py-2 text-right font-normal">
                  {t('settings.space.backups.columns.actions')}
                </th>
              </tr>
            </Eyebrow>
          </thead>
          <tbody>
            {backups.map((b) => (
              <BackupRow
                key={b.id}
                backup={b}
                onDownload={onDownload}
                onDelete={onDelete}
                onRestore={onRestore}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

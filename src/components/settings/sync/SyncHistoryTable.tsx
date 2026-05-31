import { useTranslation } from 'react-i18next';
import type { SyncEntry } from '@/db/schema';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TypographyLabel } from '@/components/ui/typography';
import { formatBytes, formatRelativeTime } from './syncFormat';

interface SyncHistoryTableProps {
  entries: SyncEntry[];
  /** Show a Space column (used in the global view across spaces). */
  showSpace?: boolean;
  /** Maps spaceId → display name, for the Space column. */
  spaceNames?: Record<string, string>;
}

interface SyncHistoryRowProps {
  entry: SyncEntry;
  showSpace: boolean;
  spaceNames: Record<string, string>;
}

const SyncHistoryRow = ({ entry, showSpace, spaceNames }: SyncHistoryRowProps) => {
  const { t } = useTranslation('screens');
  return (
    <tr data-testid={`sync-row-${entry.id}`} className="border-b border-rule">
      <td className="py-2.5 font-mono text-[12px] text-ink">
        {formatRelativeTime(entry.when, t)}
      </td>
      {showSpace ? (
        <td className="py-2.5 text-[13px] text-ink">
          {spaceNames[entry.spaceId] ?? entry.spaceId}
        </td>
      ) : null}
      <Eyebrow asChild size={10} tone="ink2">
        <td className="py-2.5">{t(`settings.sync.kind.${entry.kind}`)}</td>
      </Eyebrow>
      <td className="py-2.5 text-right font-mono text-[12px] text-ink-2">
        {entry.status === 'ok' ? formatBytes(entry.size) : '—'}
      </td>
      <td className="py-2.5 text-right">
        <StatusBadge kind={entry.status === 'ok' ? 'success' : 'error'}>
          {t(`settings.sync.status.${entry.status}`)}
        </StatusBadge>
        {entry.status === 'error' && entry.error ? (
          <span className="ml-2 font-mono text-[10px] text-ink-3">
            {entry.error}
          </span>
        ) : null}
      </td>
    </tr>
  );
};

export const SyncHistoryTable = ({
  entries,
  showSpace = false,
  spaceNames = {},
}: SyncHistoryTableProps) => {
  const { t } = useTranslation('screens');

  return (
    <div className="mt-6">
      <TypographyLabel asChild>
        <h3>{t('settings.sync.historyTitle')}</h3>
      </TypographyLabel>
      {entries.length === 0 ? (
        <EmptyState caption={t('settings.sync.historyEmpty')} />
      ) : (
        <table
          data-testid="sync-history"
          className="mt-3 w-full border-collapse text-[13px]"
        >
          <thead>
            <Eyebrow asChild size={9} tone="ink3">
              <tr className="border-b border-rule">
                <th className="py-2 text-left font-normal">
                  {t('settings.sync.columns.when')}
                </th>
                {showSpace ? (
                  <th className="py-2 text-left font-normal">
                    {t('settings.sync.columns.space')}
                  </th>
                ) : null}
                <th className="py-2 text-left font-normal">
                  {t('settings.sync.columns.kind')}
                </th>
                <th className="py-2 text-right font-normal">
                  {t('settings.sync.columns.size')}
                </th>
                <th className="py-2 text-right font-normal">
                  {t('settings.sync.columns.status')}
                </th>
              </tr>
            </Eyebrow>
          </thead>
          <tbody>
            {entries.map((e) => (
              <SyncHistoryRow
                key={e.id}
                entry={e}
                showSpace={showSpace}
                spaceNames={spaceNames}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

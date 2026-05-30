import { useTranslation } from 'react-i18next';
import type { SyncEntry } from '@/db/schema';
import { TypographyLabel, TypographyP } from '@/components/ui/typography';
import { formatBytes, formatRelativeTime } from './syncFormat';

interface SyncHistoryTableProps {
  entries: SyncEntry[];
  /** Show a Space column (used in the global view across spaces). */
  showSpace?: boolean;
  /** Maps spaceId → display name, for the Space column. */
  spaceNames?: Record<string, string>;
}

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
        <div className="mx-auto mt-6 max-w-md border border-dashed border-rule bg-paper-2/40 p-6 text-center">
          <TypographyP variant="caption" className="text-[14px] text-ink-2">
            {t('settings.sync.historyEmpty')}
          </TypographyP>
        </div>
      ) : (
        <table
          data-testid="sync-history"
          className="mt-3 w-full border-collapse text-[13px]"
        >
          <thead>
            <tr className="border-b border-rule font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
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
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={e.id}
                data-testid={`sync-row-${e.id}`}
                className="border-b border-rule"
              >
                <td className="py-2.5 font-mono text-[12px] text-ink">
                  {formatRelativeTime(e.when, t)}
                </td>
                {showSpace ? (
                  <td className="py-2.5 text-[13px] text-ink">
                    {spaceNames[e.spaceId] ?? e.spaceId}
                  </td>
                ) : null}
                <td className="py-2.5 font-mono text-[10px] uppercase tracking-wider text-ink-2">
                  {t(`settings.sync.kind.${e.kind}`)}
                </td>
                <td className="py-2.5 text-right font-mono text-[12px] text-ink-2">
                  {e.status === 'ok' ? formatBytes(e.size) : '—'}
                </td>
                <td className="py-2.5 text-right font-mono text-[10px] uppercase tracking-wider">
                  <span className={e.status === 'ok' ? 'text-ink-2' : 'text-ink'}>
                    {t(`settings.sync.status.${e.status}`)}
                  </span>
                  {e.status === 'error' && e.error ? (
                    <span className="ml-2 normal-case tracking-normal text-ink-3">
                      {e.error}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

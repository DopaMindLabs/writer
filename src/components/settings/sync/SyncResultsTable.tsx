import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TypographyLabel } from '@/components/ui/typography';
import type { SpaceSyncResult } from '@/lib/sync/folderSync';

interface SyncResultsTableProps {
  results: SpaceSyncResult[];
}

/** Per-space outcome of a "Sync now (all spaces)" run. */
export const SyncResultsTable = ({ results }: SyncResultsTableProps) => {
  const { t } = useTranslation('screens');
  if (results.length === 0) return null;

  return (
    <div className="mt-6">
      <TypographyLabel asChild>
        <h3>{t('settings.sync.resultsTitle')}</h3>
      </TypographyLabel>
      <table
        data-testid="sync-results"
        className="mt-3 w-full border-collapse text-[13px]"
      >
        <tbody>
          {results.map((r) => (
            <tr
              key={r.spaceId}
              data-testid={`sync-result-${r.spaceId}`}
              className="border-b border-rule"
            >
              <td className="py-2.5 text-[13px] text-ink">{r.name}</td>
              <td className="py-2.5 text-right">
                <StatusBadge kind={r.ok ? 'success' : 'error'}>
                  {r.ok
                    ? t('settings.sync.spaceOk')
                    : t('settings.sync.spaceFailed')}
                </StatusBadge>
                {!r.ok && r.error ? (
                  <span className="ml-2 font-mono text-[10px] text-ink-3">
                    {r.error}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '@/components/settings/TabHeader';
import { SettingRow } from '@/components/settings/SettingRow';
import { Button } from '@/components/ui/Button';
import { TypographyLabel, TypographyP } from '@/components/ui/typography';
import { useSyncFolder } from '@/hooks/useSyncFolder';
import {
  forgetSyncFolder,
  pickSyncFolder,
  syncAllSpacesToFolder,
  type SpaceSyncResult,
} from '@/lib/sync/folderSync';

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

function formatRelativeTime(
  when: number,
  t: (key: string) => string,
  now: number = Date.now(),
): string {
  const diffSec = Math.max(0, Math.floor((now - when) / 1000));
  if (diffSec < 60) return t('settings.sync.justNow');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} d ago`;
  return new Date(when).toISOString().slice(0, 10);
}

export const SyncTab = () => {
  const { t } = useTranslation('screens');
  const { supported, folderName, lastSyncedAt } = useSyncFolder();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SpaceSyncResult[] | null>(null);

  if (!supported) {
    return (
      <section>
        <TabHeader
          titleKey="settings.sync.title"
          subtitleKey="settings.sync.subtitle"
        />
        <div className="mx-auto mt-6 max-w-md border border-dashed border-rule bg-paper-2/40 p-6 text-center">
          <TypographyLabel asChild>
            <h3 className="mb-2">{t('settings.sync.unsupportedTitle')}</h3>
          </TypographyLabel>
          <TypographyP variant="caption" className="text-[14px] text-ink-2">
            {t('settings.sync.unsupportedBody')}
          </TypographyP>
        </div>
      </section>
    );
  }

  const handleChoose = async () => {
    setError(null);
    try {
      await pickSyncFolder();
    } catch (err) {
      if (isAbort(err)) return; // user dismissed the picker
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDisconnect = async () => {
    setResults(null);
    await forgetSyncFolder();
  };

  const handleSync = async () => {
    setBusy(true);
    setError(null);
    try {
      const run = await syncAllSpacesToFolder();
      setResults(run.results);
    } catch (err) {
      if (isAbort(err)) return; // user dismissed the permission prompt
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <TabHeader
        titleKey="settings.sync.title"
        subtitleKey="settings.sync.subtitle"
      />

      <SettingRow
        label={t('settings.sync.folderLabel')}
        hint={t('settings.sync.folderHint')}
      >
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="font-serif text-[14px] text-ink">
            {folderName ?? t('settings.sync.noFolder')}
          </span>
          <Button
            kind="secondary"
            size="sm"
            onClick={() => void handleChoose()}
          >
            {folderName
              ? t('settings.sync.changeFolder')
              : t('settings.sync.chooseFolder')}
          </Button>
          {folderName ? (
            <Button kind="ghost" size="sm" onClick={() => void handleDisconnect()}>
              {t('settings.sync.disconnect')}
            </Button>
          ) : null}
        </div>
      </SettingRow>

      <SettingRow
        label={t('settings.sync.syncLabel')}
        hint={t('settings.sync.pushOnlyHint')}
      >
        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={() => void handleSync()}
            disabled={busy || !folderName}
          >
            {busy ? t('settings.sync.syncing') : t('settings.sync.syncNow')}
          </Button>
          <TypographyP variant="caption" className="text-[12px] text-ink-3">
            {lastSyncedAt
              ? t('settings.sync.lastSynced', {
                  when: formatRelativeTime(lastSyncedAt, t),
                })
              : t('settings.sync.neverSynced')}
          </TypographyP>
        </div>
      </SettingRow>

      {error && (
        <p
          role="alert"
          className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ink"
        >
          {t('settings.sync.syncFailed', { message: error })}
        </p>
      )}

      {results && results.length > 0 && (
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
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider ${
                        r.ok ? 'text-ink-2' : 'text-ink'
                      }`}
                    >
                      {r.ok
                        ? t('settings.sync.spaceOk')
                        : t('settings.sync.spaceFailed')}
                    </span>
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
      )}
    </section>
  );
};

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Space } from '@/db/schema';
import { TabHeader } from '@/components/settings/TabHeader';
import { SettingRow } from '@/components/settings/SettingRow';
import { Button } from '@/components/ui/Button';
import { TypographyP } from '@/components/ui/typography';
import { useSyncFolder } from '@/hooks/useSyncFolder';
import { useDefaultInterval, useSpaceInterval, useSyncHistory } from '@/hooks/useSync';
import {
  pickSyncFolder,
  setSpaceIntervalMin,
  syncOneSpace,
} from '@/lib/sync/folderSync';
import { IntervalSelector } from '@/components/settings/sync/IntervalSelector';
import { SyncHistoryTable } from '@/components/settings/sync/SyncHistoryTable';
import { intervalLabel } from '@/components/settings/sync/syncFormat';

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export const SpaceSyncTab = ({ space }: { space: Space }) => {
  const { t } = useTranslation('screens');
  const { supported, folderName } = useSyncFolder();
  const defaultInterval = useDefaultInterval();
  const { own } = useSpaceInterval(space.id);
  const history = useSyncHistory(space.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supported) {
    return (
      <section>
        <TabHeader
          titleKey="settings.space.sync.title"
          subtitleKey="settings.space.sync.subtitle"
          breadcrumbKey="settings.space.breadcrumb"
        />
        <div className="mx-auto mt-6 max-w-md border border-dashed border-rule bg-paper-2/40 p-6 text-center">
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
      if (isAbort(err)) return;
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSync = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await syncOneSpace(space.id);
      if (!res.ok) setError(res.error ?? 'Sync failed');
    } catch (err) {
      if (isAbort(err)) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <TabHeader
        titleKey="settings.space.sync.title"
        subtitleKey="settings.space.sync.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />

      <SettingRow
        label={t('settings.sync.folderLabel')}
        hint={t('settings.space.sync.folderHint')}
      >
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="font-serif text-[14px] text-ink">
            {folderName ?? t('settings.sync.noFolder')}
          </span>
          {!folderName ? (
            <Button kind="secondary" size="sm" onClick={() => void handleChoose()}>
              {t('settings.sync.chooseFolder')}
            </Button>
          ) : null}
        </div>
      </SettingRow>

      <SettingRow
        label={t('settings.sync.intervalLabel')}
        hint={t('settings.space.sync.intervalHint')}
      >
        <IntervalSelector
          value={own}
          onChange={(v) => void setSpaceIntervalMin(space.id, v)}
          inheritLabel={t('settings.sync.intervalDefault', {
            label: intervalLabel(defaultInterval, t),
          })}
          ariaLabel={t('settings.sync.intervalLabel')}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.sync.syncLabel')}
        hint={t('settings.sync.pushOnlyHint')}
      >
        <Button onClick={() => void handleSync()} disabled={busy || !folderName}>
          {busy ? t('settings.sync.syncing') : t('settings.space.sync.syncNow')}
        </Button>
      </SettingRow>

      {error && (
        <p
          role="alert"
          className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ink"
        >
          {t('settings.sync.syncFailed', { message: error })}
        </p>
      )}

      <SyncHistoryTable entries={history} />
    </section>
  );
};

import { useTranslation } from 'react-i18next';
import { TabHeader } from '@/components/settings/TabHeader';
import { SettingRow } from '@/components/settings/SettingRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusGlyph } from '@/components/ui/StatusGlyph';
import { useSyncFolder } from '@/hooks/useSyncFolder';
import { useDefaultInterval, useSyncHistory } from '@/hooks/useSync';
import { useSpaces } from '@/hooks/useSpaces';
import { useFolderSyncActions } from '@/hooks/useFolderSyncActions';
import { setDefaultIntervalMin } from '@/lib/sync/folderSync';
import { IntervalSelector } from '@/components/settings/sync/IntervalSelector';
import { SyncFolderRow } from '@/components/settings/sync/SyncFolderRow';
import { SyncRunRow } from '@/components/settings/sync/SyncRunRow';
import { SyncHistoryTable } from '@/components/settings/sync/SyncHistoryTable';
import { SyncResultsTable } from '@/components/settings/sync/SyncResultsTable';
import { SyncPermissionHint } from '@/components/settings/sync/SyncPermissionHint';

const SyncTabConnected = () => {
  const { t } = useTranslation('screens');
  const { folderName, lastSyncedAt } = useSyncFolder();
  const defaultInterval = useDefaultInterval();
  const history = useSyncHistory();
  const spaces = useSpaces();
  const { busy, error, results, choose, disconnect, sync } =
    useFolderSyncActions();
  const spaceNames = Object.fromEntries(spaces.map((s) => [s.id, s.name]));

  return (
    <>
      <SyncPermissionHint folderName={folderName} />
      <SyncFolderRow
        folderName={folderName}
        hint={t('settings.sync.folderHint')}
        onChoose={() => void choose()}
        onDisconnect={() => void disconnect()}
      />
      <SettingRow
        label={t('settings.sync.intervalLabel')}
        hint={t('settings.sync.intervalHint')}
      >
        <IntervalSelector
          value={defaultInterval}
          onChange={(v) => void setDefaultIntervalMin(v)}
          ariaLabel={t('settings.sync.intervalLabel')}
        />
      </SettingRow>
      <SyncRunRow
        busy={busy}
        disabled={!folderName}
        idleLabel={t('settings.sync.syncNowAll')}
        onSync={() => void sync()}
        lastSyncedAt={lastSyncedAt}
      />
      {error ? (
        <StatusGlyph kind="error" role="alert" className="mt-3">
          {t('settings.sync.syncFailed', { message: error })}
        </StatusGlyph>
      ) : null}
      {results ? <SyncResultsTable results={results} /> : null}
      <SyncHistoryTable entries={history} showSpace spaceNames={spaceNames} />
    </>
  );
};

export const SyncTab = () => {
  const { t } = useTranslation('screens');
  const { supported } = useSyncFolder();

  return (
    <section>
      <TabHeader
        titleKey="settings.sync.title"
        subtitleKey="settings.sync.subtitle"
      />
      {supported ? (
        <SyncTabConnected />
      ) : (
        <EmptyState
          title={t('settings.sync.unsupportedTitle')}
          caption={t('settings.sync.unsupportedBody')}
        />
      )}
    </section>
  );
};

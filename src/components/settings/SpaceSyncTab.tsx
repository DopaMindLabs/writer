import { useTranslation } from 'react-i18next';
import type { Space } from '@/db/schema';
import { TabHeader } from '@/components/settings/TabHeader';
import { SettingRow } from '@/components/settings/SettingRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusGlyph } from '@/components/ui/StatusGlyph';
import { useSyncFolder } from '@/hooks/useSyncFolder';
import {
  useDefaultInterval,
  useSpaceInterval,
  useSyncHistory,
} from '@/hooks/useSync';
import { useFolderSyncActions } from '@/hooks/useFolderSyncActions';
import { setSpaceIntervalMin } from '@/lib/sync/folderSync';
import { IntervalSelector } from '@/components/settings/sync/IntervalSelector';
import { SyncFolderRow } from '@/components/settings/sync/SyncFolderRow';
import { SyncRunRow } from '@/components/settings/sync/SyncRunRow';
import { SyncHistoryTable } from '@/components/settings/sync/SyncHistoryTable';
import { SyncPermissionHint } from '@/components/settings/sync/SyncPermissionHint';
import { intervalLabel } from '@/components/settings/sync/syncFormat';

export const SpaceSyncTab = ({ space }: { space: Space }) => {
  const { t } = useTranslation('screens');
  const { supported, folderName } = useSyncFolder();
  const defaultInterval = useDefaultInterval();
  const { own } = useSpaceInterval(space.id);
  const history = useSyncHistory(space.id);
  const { busy, error, choose, sync } = useFolderSyncActions(space.id);

  return (
    <section data-testid="space-settings-tab-sync">
      <TabHeader
        titleKey="settings.space.sync.title"
        subtitleKey="settings.space.sync.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />

      {!supported ? (
        <EmptyState caption={t('settings.sync.unsupportedBody')} />
      ) : (
        <>
          <SyncPermissionHint folderName={folderName} />
          <SyncFolderRow
            folderName={folderName}
            hint={t('settings.space.sync.folderHint')}
            onChoose={() => void choose()}
          />
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
          <SyncRunRow
            busy={busy}
            disabled={!folderName}
            idleLabel={t('settings.space.sync.syncNow')}
            onSync={() => void sync()}
          />
          {error ? (
            <StatusGlyph kind="error" role="alert" className="mt-3">
              {t('settings.sync.syncFailed', { message: error })}
            </StatusGlyph>
          ) : null}
          <SyncHistoryTable entries={history} />
        </>
      )}
    </section>
  );
};

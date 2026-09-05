import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { StatusGlyph } from '@/components/ui/StatusGlyph';
import { useStoragePersistence } from '@/hooks/useStoragePersistence';
import type { StoragePersistence } from '@/lib/pwa/persistentStorage';
import type { StatusKind } from '@/components/ui/statusRole';

const PERSISTENCE_GLYPHS: Record<
  StoragePersistence,
  { kind: StatusKind; labelKey: string }
> = {
  persistent: { kind: 'success', labelKey: 'settings.export.storagePersistent' },
  'best-effort': {
    kind: 'warning',
    labelKey: 'settings.export.storageBestEffort',
  },
  unsupported: { kind: 'info', labelKey: 'settings.export.storageUnsupported' },
};

/**
 * Read-only status row reporting how durably the browser holds this origin's
 * data. Persistence is requested silently at boot; this row surfaces the
 * outcome so a writer can tell whether their work is protected from automatic
 * storage clean-up.
 */
export const StoragePersistenceRow = () => {
  const { t } = useTranslation('screens');
  const persistence = useStoragePersistence();

  return (
    <SettingRow
      data-testid="settings-storage-protection"
      label={t('settings.export.storageLabel')}
      hint={t('settings.export.storageHint')}
    >
      {persistence === 'unknown' ? (
        <span className="font-serif text-[13px] text-ink-3">…</span>
      ) : (
        <StatusGlyph kind={PERSISTENCE_GLYPHS[persistence].kind}>
          {t(PERSISTENCE_GLYPHS[persistence].labelKey)}
        </StatusGlyph>
      )}
    </SettingRow>
  );
};

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useImportSpace } from '@/hooks/useImportSpace';
import { TabHeader } from '@/components/settings/TabHeader';
import { SettingRow } from '@/components/settings/SettingRow';
import { ComingSoonRow } from '@/components/settings/ComingSoonRow';
import { Button } from '@/components/ui/Button';
import { StatusGlyph } from '@/components/ui/StatusGlyph';

export const ExportImportTab = () => {
  const { t } = useTranslation('screens');
  const { busy, error, importFile } = useImportSpace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (!file) return;
    // Reset before importing so the same archive can be chosen again, even
    // after a failed attempt.
    input.value = '';
    await importFile(file);
  };

  return (
    <section data-testid="settings-export-import">
      <TabHeader
        titleKey="settings.export.title"
        subtitleKey="settings.export.subtitle"
      />

      <SettingRow
        data-testid="settings-import-space"
        label={t('settings.export.importSpaceLabel')}
        hint={t('settings.export.importSpaceHint')}
      >
        <input
          ref={fileInputRef}
          data-testid="settings-import-file-input"
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          aria-label={t('settings.export.importSpaceLabel')}
          onChange={(e) => void handleFileChange(e.currentTarget)}
        />
        <Button
          data-testid="settings-import-button"
          size="sm"
          disabled={busy}
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          {busy
            ? t('settings.export.importing')
            : t('settings.export.importChooseFile')}
        </Button>
      </SettingRow>

      <div role="status" aria-live="polite">
        {error && (
          <StatusGlyph kind="error" role="alert" className="mt-3">
            {t('settings.export.importFailed', { message: error })}
          </StatusGlyph>
        )}
      </div>

      <ComingSoonRow
        label={t('settings.export.comingSoonLabel')}
        hint={t('settings.export.comingSoonHint')}
        tooltip={t('settings.export.comingSoonTooltip')}
      />
    </section>
  );
};

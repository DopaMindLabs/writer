import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/settings/SettingRow';
import { TabHeader } from '@/components/settings/TabHeader';
import { LanguagePicker } from '@/components/ui/LanguagePicker';

export const LanguageTab = () => {
  const { t } = useTranslation('screens');

  return (
    <section>
      <TabHeader
        titleKey="settings.language.title"
        subtitleKey="settings.language.subtitle"
      />

      <SettingRow
        data-testid="setting-language"
        label={t('settings.language.label')}
        hint={t('settings.language.hint')}
      >
        <LanguagePicker ariaLabel={t('settings.language.label')} />
      </SettingRow>

      <div
        role="note"
        data-testid="language-machine-translation-notice"
        className="mt-4 border border-rule bg-paper-2 p-3 text-[13px] text-ink-2"
      >
        {t('settings.language.machineTranslationNotice')}
      </div>
    </section>
  );
};

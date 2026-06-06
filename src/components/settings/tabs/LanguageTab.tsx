import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { supportedLngs } from '@/i18n/resources';
import { SettingRow } from '@/components/settings/SettingRow';
import { TabHeader } from '@/components/settings/TabHeader';
import { Select, type SelectOption } from '@/components/ui/Select';

const getDisplayName = (code: string, displayLocale: string): string => {
  try {
    const dn = new Intl.DisplayNames([displayLocale], { type: 'language' });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
};

export const LanguageTab = () => {
  const { t, i18n: tI18n } = useTranslation('screens');
  const current = tI18n.language;

  const options: readonly SelectOption[] = (
    supportedLngs as readonly string[]
  ).map((code) => ({
    value: code,
    label: getDisplayName(code, current),
  }));

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    void i18n.changeLanguage(event.target.value);
  };

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
        <Select
          options={options}
          value={current}
          onChange={handleChange}
          aria-label={t('settings.language.label')}
        />
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

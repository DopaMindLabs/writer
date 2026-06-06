import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { supportedLngs } from '@/i18n/resources';
import { Select, type SelectOption } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

const getDisplayName = (code: string, displayLocale: string): string => {
  try {
    const dn = new Intl.DisplayNames([displayLocale], { type: 'language' });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
};

interface LanguagePickerProps {
  readonly ariaLabel: string;
  readonly className?: string;
  readonly 'data-testid'?: string;
}

export const LanguagePicker = ({
  ariaLabel,
  className,
  'data-testid': dataTestId,
}: LanguagePickerProps) => {
  const { i18n: tI18n } = useTranslation();
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
    <Select
      className={cn(className)}
      options={options}
      value={current}
      onChange={handleChange}
      aria-label={ariaLabel}
      data-testid={dataTestId}
    />
  );
};

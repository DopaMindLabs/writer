import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { supportedLngs } from '@/i18n/resources';
import { Select, type SelectOption } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

const getOptionLabel = (code: string): string => {
  try {
    const nativeFmt = new Intl.DisplayNames([code], { type: 'language' });
    const englishFmt = new Intl.DisplayNames(['en'], { type: 'language' });
    const native = nativeFmt.of(code);
    const english = englishFmt.of(code);
    if (!native || !english) return code;
    if (native.toLowerCase() === english.toLowerCase()) return english;
    return `${native} (${english})`;
  } catch {
    return code;
  }
};

const LANGUAGE_OPTIONS: readonly SelectOption[] = (
  supportedLngs as readonly string[]
).map((code) => ({
  value: code,
  label: getOptionLabel(code),
}));

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

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    void i18n.changeLanguage(event.target.value);
  };

  return (
    <Select
      className={cn(className)}
      options={LANGUAGE_OPTIONS}
      value={current}
      onChange={handleChange}
      aria-label={ariaLabel}
      data-testid={dataTestId}
    />
  );
};

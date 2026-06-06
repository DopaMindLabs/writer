import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { supportedLngs } from '@/i18n/resources';
import { Select, type SelectOption } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

/**
 * Render each option as `Native (English)` — e.g. `Español (Spanish)`,
 * `日本語 (Japanese)`. The label is derived only from the locale code, so it
 * does not change with the active UI language. This means a user who picks the
 * wrong locale can still recognise and revert to their preferred one without
 * needing to read the now-foreign chrome.
 */
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

/** Computed once at module load — labels never change with i18n.language. */
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

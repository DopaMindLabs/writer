import { useTranslation } from 'react-i18next';
import { ChipGroup, type ChipGroupOption } from '@/components/ui/ChipGroup';
import { RETENTION_OPTIONS } from '@/lib/writerSyncIntegration/journalRetentionPreference';

export interface JournalRetentionSelectorProps {
  /** The current window in days. */
  value: number;
  onChange: (days: number) => void;
  ariaLabel: string;
}

export const JournalRetentionSelector = ({
  value,
  onChange,
  ariaLabel,
}: JournalRetentionSelectorProps) => {
  const { t } = useTranslation('screens');
  const options: ChipGroupOption[] = RETENTION_OPTIONS.map((days) => ({
    label:
      days === 365
        ? t('settings.pairing.retention.oneYear')
        : t('settings.pairing.retention.days', { count: days }),
    value: days,
  }));

  return <ChipGroup options={options} value={value} onChange={onChange} label={ariaLabel} />;
};

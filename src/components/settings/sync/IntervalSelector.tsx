import { useTranslation } from 'react-i18next';
import { ChipGroup, type ChipGroupOption } from '@/components/ui/ChipGroup';
import { INHERIT_INTERVAL, INTERVAL_OPTIONS } from '@/lib/sync/folderSync';
import { intervalLabel } from './syncFormat';

interface IntervalSelectorProps {
  value: number;
  onChange: (value: number) => void;
  /** When set, prepends a "Default (…)" chip mapped to INHERIT_INTERVAL. */
  inheritLabel?: string;
  ariaLabel?: string;
}

export const IntervalSelector = ({
  value,
  onChange,
  inheritLabel,
  ariaLabel,
}: IntervalSelectorProps) => {
  const { t } = useTranslation('screens');
  const options: ChipGroupOption[] = [
    ...(inheritLabel !== undefined
      ? [{ label: inheritLabel, value: INHERIT_INTERVAL }]
      : []),
    ...INTERVAL_OPTIONS.map((opt) => ({
      label: intervalLabel(opt, t),
      value: opt,
    })),
  ];

  return (
    <ChipGroup
      options={options}
      value={value}
      onChange={onChange}
      label={ariaLabel}
    />
  );
};

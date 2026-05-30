import { useTranslation } from 'react-i18next';
import { Chip } from '@/components/ui/Chip';
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
  const options: number[] = [
    ...(inheritLabel !== undefined ? [INHERIT_INTERVAL] : []),
    ...INTERVAL_OPTIONS,
  ];

  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <Chip
          key={opt}
          active={opt === value}
          onClick={() => { onChange(opt); }}
        >
          {opt === INHERIT_INTERVAL ? inheritLabel : intervalLabel(opt, t)}
        </Chip>
      ))}
    </div>
  );
};

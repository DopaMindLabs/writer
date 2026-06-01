import { useTranslation } from 'react-i18next';
import { Chip } from '@/components/ui/Chip';
import type { InspectorToggle } from '@/db/schema';

// A per-space tri-state selector (Default / On / Off) mirroring the sync
// IntervalSelector. The "Default" chip shows the resolved global state so the
// user can see what inheriting means before choosing it.
interface InspectorToggleSelectorProps {
  value: InspectorToggle;
  /** The resolved global default, shown on the inherit chip. */
  defaultOn: boolean;
  onChange: (value: InspectorToggle) => void;
  ariaLabel: string;
}

const ORDER: readonly InspectorToggle[] = ['inherit', 'on', 'off'];

export const InspectorToggleSelector = ({
  value,
  defaultOn,
  onChange,
  ariaLabel,
}: InspectorToggleSelectorProps) => {
  const { t } = useTranslation('screens');
  const labelFor = (toggle: InspectorToggle): string => {
    if (toggle === 'on') return t('settings.docInspector.on');
    if (toggle === 'off') return t('settings.docInspector.off');
    return t('settings.docInspector.inherit', {
      state: t(
        defaultOn
          ? 'settings.docInspector.stateOn'
          : 'settings.docInspector.stateOff',
      ),
    });
  };
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {ORDER.map((toggle) => (
        <Chip
          key={toggle}
          active={toggle === value}
          data-testid={`inspector-toggle-${toggle}`}
          onClick={() => {
            onChange(toggle);
          }}
        >
          {labelFor(toggle)}
        </Chip>
      ))}
    </div>
  );
};

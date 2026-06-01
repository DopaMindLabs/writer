import { useTranslation } from 'react-i18next';
import { Chip } from '@/components/ui/Chip';
import type { InspectorToggle } from '@/db/schema';

// A segmented selector for a Doc Inspector toggle, used in both settings scopes
// so they share one control (mirroring the Editor and Sync tabs):
//   - global: On / Off (includeInherit = false);
//   - space:  Default / On / Off — the "Default" chip shows the resolved global
//     state so the user can see what inheriting means before choosing it.
interface InspectorToggleSelectorProps {
  value: InspectorToggle;
  onChange: (value: InspectorToggle) => void;
  ariaLabel: string;
  /** Include the inherit ("Default") chip — true for space, false for global. */
  includeInherit?: boolean;
  /** The resolved global default, shown on the inherit chip. */
  defaultOn?: boolean;
}

const WITH_INHERIT: readonly InspectorToggle[] = ['inherit', 'on', 'off'];
const WITHOUT_INHERIT: readonly InspectorToggle[] = ['on', 'off'];

export const InspectorToggleSelector = ({
  value,
  onChange,
  ariaLabel,
  includeInherit = true,
  defaultOn = false,
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
  const order = includeInherit ? WITH_INHERIT : WITHOUT_INHERIT;
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {order.map((toggle) => (
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

import { useTranslation } from 'react-i18next';
import { Chip } from '@/components/ui/Chip';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { InspectorToggle } from '@/db/schema';

interface InspectorToggleSelectorProps {
  value: InspectorToggle;
  onChange: (value: InspectorToggle) => void;
  ariaLabel: string;
  includeInherit?: boolean;
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
      {order.map((toggle) => {
        const chip = (
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
        );
        if (toggle !== 'inherit') return chip;
        return (
          <Tooltip key={toggle}>
            <TooltipTrigger asChild>{chip}</TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs"
              data-testid="inspector-toggle-inherit-tooltip"
            >
              {t('settings.docInspector.inheritTooltip')}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

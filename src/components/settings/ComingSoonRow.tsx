import { HelpCircle } from '@/components/libs/icons';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/icon';
import { SettingRow } from './SettingRow';
import { ComingSoonBadge } from './ComingSoonBadge';

interface ComingSoonRowProps {
  label: string;
  hint?: string;
  tooltip: string;
}

export const ComingSoonRow = ({ label, hint, tooltip }: ComingSoonRowProps) => {
  const { t } = useTranslation('screens');
  return (
    <SettingRow
      data-testid="coming-soon-row"
      label={label}
      hint={hint}
      disabled
    >
      <div className="flex items-center gap-3">
        <Checkbox
          data-testid="coming-soon-row-checkbox"
          disabled
          aria-disabled="true"
          aria-label={label}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton
              data-testid="coming-soon-row-help"
              icon={HelpCircle}
              label={t('settings.helpAria')}
              className="h-5 w-5"
            />
          </TooltipTrigger>
          <TooltipContent
            data-testid="coming-soon-row-tooltip"
            side="top"
            className="max-w-xs"
          >
            {tooltip}
          </TooltipContent>
        </Tooltip>
        <ComingSoonBadge />
      </div>
    </SettingRow>
  );
};

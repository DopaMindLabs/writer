import { HelpCircle } from '@/components/libs/icons';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    <SettingRow label={label} hint={hint} disabled>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          disabled
          aria-disabled="true"
          className="h-4 w-4 accent-ink"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t('settings.helpAria')}
              className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-ink-3 hover:text-ink"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
        <ComingSoonBadge />
      </div>
    </SettingRow>
  );
};

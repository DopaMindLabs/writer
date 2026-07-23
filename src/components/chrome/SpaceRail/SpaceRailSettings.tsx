import { MoreVertical } from '@/components/libs/icons';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { QuickSettingsPopover } from '@/components/chrome/QuickSettings';

export const SpaceRailSettings = () => {
  const { t } = useTranslation('chrome');
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger
            data-tour="tour-topbar-theme"
            aria-label={t('quickSettings.trigger')}
            className={cn(
              'group inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
              'text-ink-3 hover:bg-paper hover:text-ink',
              'data-[state=open]:bg-paper data-[state=open]:text-ink',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink',
            )}
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          {t('quickSettings.trigger')}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={8}
        className="p-0"
      >
        <QuickSettingsPopover />
      </PopoverContent>
    </Popover>
  );
};

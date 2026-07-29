import { useTranslation } from 'react-i18next';
import { Settings } from '@/components/libs/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Space } from '@/db/schema';
import { SpaceMenuPopover } from '@/components/chrome/SpaceMenuPopover';

export const SpaceMenu = ({
  space,
  onRename,
}: {
  space: Space;
  onRename: () => void;
}) => {
  const { t } = useTranslation('chrome');
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger
            data-tour="tour-sidebar-settings"
            data-testid="sidebar-space-menu-trigger"
            aria-label={t('chrome:sidebar.openSpaceMenu')}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-ink-3 opacity-0 transition-opacity hover:bg-paper hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink group-hover:opacity-100 data-[state=open]:bg-ink data-[state=open]:text-paper data-[state=open]:opacity-100"
          >
            <Settings className="h-3.5 w-3.5" />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          {t('chrome:sidebar.openSpaceMenu')}
        </TooltipContent>
      </Tooltip>
      <PopoverContent side="bottom" align="start" sideOffset={6} className="p-0">
        <SpaceMenuPopover space={space} onRename={onRename} />
      </PopoverContent>
    </Popover>
  );
};

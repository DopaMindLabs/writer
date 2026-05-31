import { MoreVertical } from '@/components/libs/icons';
import { useTranslation } from 'react-i18next';
import { useSpaces } from '@/hooks/useSpaces';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
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
import { IconButton } from '@/components/ui/icon';
import { Link } from '@/components/ui/Link';
import { QuickSettingsPopover } from './QuickSettingsPopover';

interface FocusRailProps {
  activeSpaceId: string | null;
}

export const FocusRail = ({ activeSpaceId }: FocusRailProps) => {
  const { t } = useTranslation('chrome');
  const spaces = useSpaces();

  return (
    <aside className="flex w-9 shrink-0 flex-col items-center gap-3.5 border-r border-rule bg-paper py-3.5">
      <div className="font-serif text-sm leading-none text-ink">L</div>
      <div className="h-px w-4 bg-rule" />
      {spaces.map((w) => (
        <Link
          key={w.id}
          to={routes.spaceWrite(w.id)}
          aria-label={w.name}
          className={cn(
            'h-1 w-1 rounded-full',
            w.id === activeSpaceId ? 'bg-ink' : 'bg-rule',
          )}
        />
      ))}
      <div className="flex-1" />
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <IconButton
                icon={MoreVertical}
                label={t('quickSettings.trigger')}
              />
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
    </aside>
  );
};

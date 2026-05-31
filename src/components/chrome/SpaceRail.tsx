import { MoreVertical, Plus } from '@/components/libs/icons';
import { useTranslation } from 'react-i18next';
import { useSpaces } from '@/hooks/useSpaces';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Link } from '@/components/ui/Link';
import { QuickSettingsPopover } from './QuickSettingsPopover';

interface SpaceRailProps {
  activeSpaceId: string | null;
}

interface SpaceRailTileProps {
  space: ReturnType<typeof useSpaces>[number];
  isActive: boolean;
}

const SpaceRailTile = ({ space, isActive }: SpaceRailTileProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Link
        to={routes.spaceWrite(space.id)}
        data-testid={`space-rail-space-${space.id}`}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-md font-mono text-[10px] font-medium tracking-wider transition-colors',
          isActive
            ? 'bg-ink text-paper'
            : 'bg-transparent text-ink-2 hover:bg-paper hover:text-ink',
        )}
      >
        {space.tag}
        {space.shared && (
          <span
            className={cn(
              'absolute right-0.5 top-0.5 h-1 w-1 rounded-full',
              isActive ? 'bg-paper' : 'bg-ink',
            )}
          />
        )}
      </Link>
    </TooltipTrigger>
    <TooltipContent side="right">{space.name}</TooltipContent>
  </Tooltip>
);

const SpaceRailHeader = () => (
  <>
    <Link
      to={routes.home()}
      aria-label="Home"
      className="mb-1 flex h-7 w-7 items-center justify-center rounded-md font-serif text-lg leading-none tracking-tight text-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
    >
      L
    </Link>
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="mb-2.5 cursor-help rounded-sm border border-[color:var(--warning)] bg-[color:var(--warning-bg)] px-1 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[color:var(--warning)]"
        >
          exp
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[220px]">
        <div className="font-medium">Experimental build</div>
        <div className="mt-0.5 text-[11px] opacity-80">
          Your work lives in this browser. Connect a sync folder in Settings → Sync to push copies out; otherwise clearing your cache loses it.
        </div>
      </TooltipContent>
    </Tooltip>
  </>
);

const SpaceRailSettings = () => {
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

export const SpaceRail = ({ activeSpaceId }: SpaceRailProps) => {
  const spaces = useSpaces();

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-rule bg-paper-2 py-3.5">
      <SpaceRailHeader />
      {spaces.map((w) => (
        <SpaceRailTile
          key={w.id}
          space={w}
          isActive={w.id === activeSpaceId}
        />
      ))}
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={routes.templates()}
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-4 hover:bg-paper hover:text-ink-2"
            aria-label="Create new space"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Create new space</TooltipContent>
      </Tooltip>
      <div className="flex-1" />
      <SpaceRailSettings />
    </aside>
  );
};

import { Plus } from '@/components/libs/icons';
import { useTranslation } from 'react-i18next';
import { useSpaces } from '@/hooks/useSpaces';
import { routes } from '@/lib/routes';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from '@/components/ui/Link';
import { SpaceRailHeader } from './SpaceRailHeader';
import { SpaceRailTile } from './SpaceRailTile';
import { SpaceRailSettings } from './SpaceRailSettings';

interface SpaceRailProps {
  activeSpaceId: string | null;
}

export const SpaceRail = ({ activeSpaceId }: SpaceRailProps) => {
  const spaces = useSpaces();
  const { t } = useTranslation('chrome');

  return (
    <aside
      aria-label={t('spaceRail.landmarkLabel')}
      className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-rule bg-paper-2 py-3.5"
    >
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

import { useSpaces } from '@/hooks/useSpaces';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from '@/components/ui/Link';

interface SpaceRailTileProps {
  space: ReturnType<typeof useSpaces>[number];
  isActive: boolean;
}

export const SpaceRailTile = ({ space, isActive }: SpaceRailTileProps) => (
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

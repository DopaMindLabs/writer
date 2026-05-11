import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useWorlds } from '@/hooks/useWorlds';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface WorldRailProps {
  activeWorldId: string | null;
}

export function WorldRail({ activeWorldId }: WorldRailProps) {
  const worlds = useWorlds() ?? [];

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-rule bg-paper-2 py-3.5">
      <div className="mb-2.5 font-serif text-lg leading-none tracking-tight text-ink">
        L
      </div>
      {worlds.map((w) => {
        const isActive = w.id === activeWorldId;
        return (
          <Tooltip key={w.id}>
            <TooltipTrigger asChild>
              <Link
                to={`/w/${w.id}`}
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center rounded-md border font-mono text-[10px] font-medium tracking-wider transition-colors',
                  isActive
                    ? 'border-ink bg-ink text-paper'
                    : 'border-rule bg-transparent text-ink-2 hover:bg-paper',
                )}
              >
                {w.tag}
                {w.shared && (
                  <span
                    className={cn(
                      'absolute right-0.5 top-0.5 h-1 w-1 rounded-full',
                      isActive ? 'bg-paper' : 'bg-ink',
                    )}
                  />
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{w.name}</TooltipContent>
          </Tooltip>
        );
      })}
      <div className="flex-1" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/new"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-rule text-ink-4 hover:bg-paper hover:text-ink-2"
            aria-label="Create new world"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Create new world</TooltipContent>
      </Tooltip>
    </aside>
  );
}

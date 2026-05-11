import { Link } from 'react-router-dom';
import { useWorlds } from '@/hooks/useWorlds';
import { cn } from '@/lib/utils';

interface FocusRailProps {
  activeWorldId: string | null;
}

export function FocusRail({ activeWorldId }: FocusRailProps) {
  const worlds = useWorlds() ?? [];

  return (
    <aside className="flex w-9 shrink-0 flex-col items-center gap-3.5 border-r border-rule bg-paper py-3.5">
      <div className="font-serif text-sm leading-none text-ink">L</div>
      <div className="h-px w-4 bg-rule" />
      {worlds.map((w) => (
        <Link
          key={w.id}
          to={`/w/${w.id}`}
          aria-label={w.name}
          className={cn(
            'h-1 w-1 rounded-full',
            w.id === activeWorldId ? 'bg-ink' : 'bg-rule',
          )}
        />
      ))}
    </aside>
  );
}

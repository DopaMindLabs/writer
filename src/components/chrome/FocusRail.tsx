import { Link } from 'react-router-dom';
import { useSpaces } from '@/hooks/useSpaces';
import { cn } from '@/lib/utils';

interface FocusRailProps {
  activeSpaceId: string | null;
}

export function FocusRail({ activeSpaceId }: FocusRailProps) {
  const spaces = useSpaces() ?? [];

  return (
    <aside className="flex w-9 shrink-0 flex-col items-center gap-3.5 border-r border-rule bg-paper py-3.5">
      <div className="font-serif text-sm leading-none text-ink">L</div>
      <div className="h-px w-4 bg-rule" />
      {spaces.map((w) => (
        <Link
          key={w.id}
          to={`/s/${w.id}`}
          aria-label={w.name}
          className={cn(
            'h-1 w-1 rounded-full',
            w.id === activeSpaceId ? 'bg-ink' : 'bg-rule',
          )}
        />
      ))}
    </aside>
  );
}

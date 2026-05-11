import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'normal' | 'focus';

interface ModeToggleProps {
  mode: Mode;
  worldId: string;
  docId: string | null;
}

export function ModeToggle({ mode, worldId, docId }: ModeToggleProps) {
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key !== '\\') return;
      e.preventDefault();
      if (!docId) return;
      const target =
        mode === 'focus'
          ? `/w/${worldId}/d/${docId}`
          : `/w/${worldId}/d/${docId}/focus`;
      navigate(target);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, worldId, docId, navigate]);

  if (!docId) return null;

  const isFocus = mode === 'focus';
  const target = isFocus
    ? `/w/${worldId}/d/${docId}`
    : `/w/${worldId}/d/${docId}/focus`;

  return (
    <Link
      to={target}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-3 hover:bg-paper-2 hover:text-ink',
      )}
      aria-label={isFocus ? 'Exit focus mode' : 'Enter focus mode'}
      title={`${isFocus ? 'Normal' : 'Focus'} (⌘\\)`}
    >
      {isFocus ? (
        <>
          <Minimize2 className="h-3 w-3" />
          NORMAL
        </>
      ) : (
        <>
          <Maximize2 className="h-3 w-3" />
          FOCUS
        </>
      )}
    </Link>
  );
}

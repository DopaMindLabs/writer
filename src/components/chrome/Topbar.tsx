import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Quote } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { ModeTabs, FocusToggle, type Mode } from './ModeToggle';
import { cn } from '@/lib/utils';

interface TopbarProps {
  worldId: string;
  docId: string | null;
  docName?: string;
  worldName?: string;
  mode: Mode;
}

export function Topbar({
  worldId,
  docId,
  docName,
  worldName,
  mode,
}: TopbarProps) {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const onCitations = location.pathname.endsWith('/citations');

  return (
    <header className="flex h-10 shrink-0 items-center gap-4 border-b border-rule bg-paper px-4">
      <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
        <span>{worldName ?? '…'}</span>
        {docName && (
          <>
            <span className="text-ink-4">/</span>
            <span className="text-ink">{docName}</span>
          </>
        )}
      </div>
      <div className="flex-1" />
      {!onCitations && (
        <ModeTabs mode={mode} worldId={worldId} docId={docId} />
      )}
      <Link
        to={`/w/${worldId}/citations`}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider hover:bg-paper-2',
          onCitations ? 'text-ink' : 'text-ink-3',
        )}
      >
        <Quote className="h-3 w-3" />
        Citations
      </Link>
      {!onCitations && (mode === 'dump' || docId) && (
        <FocusToggle mode={mode} worldId={worldId} docId={docId} />
      )}
      <button
        type="button"
        onClick={toggle}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-paper-2 hover:text-ink"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="h-3.5 w-3.5" />
        ) : (
          <Moon className="h-3.5 w-3.5" />
        )}
      </button>
    </header>
  );
}

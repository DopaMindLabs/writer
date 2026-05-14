import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Quote, Menu, Contrast, Check } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import type { Theme } from '@/store/ui';
import { useUI } from '@/store/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModeTabs, FocusToggle, type Mode } from './ModeToggle';
import { MobileNavDrawer } from './MobileNavDrawer';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'hc-light', label: 'High contrast (light)' },
  { value: 'hc-dark', label: 'High contrast (dark)' },
];

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === 'hc-light' || theme === 'hc-dark') {
    return <Contrast className="h-3.5 w-3.5" />;
  }
  return theme === 'dark' ? (
    <Moon className="h-3.5 w-3.5" />
  ) : (
    <Sun className="h-3.5 w-3.5" />
  );
}

interface TopbarProps {
  spaceId: string;
  docId: string | null;
  docName?: string;
  spaceName?: string;
  mode: Mode;
  fallbackDocId?: string | null;
}

export function Topbar({
  spaceId,
  docId,
  docName,
  spaceName,
  mode,
  fallbackDocId,
}: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const setMobileNavOpen = useUI((s) => s.setMobileNavOpen);
  const onCitations = location.pathname.endsWith('/citations');

  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b border-rule bg-paper px-3 md:gap-4 md:px-4">
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-paper-2 hover:text-ink md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
        <span className="hidden md:inline">{spaceName ?? '…'}</span>
        {docName && (
          <>
            <span className="hidden text-ink-4 md:inline">/</span>
            <span className="text-ink">{docName}</span>
          </>
        )}
      </div>
      <div className="flex-1" />
      {!onCitations && (
        <ModeTabs
          mode={mode}
          spaceId={spaceId}
          docId={docId}
          fallbackDocId={fallbackDocId}
        />
      )}
      <Link
        to={`/s/${spaceId}/citations`}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider hover:bg-paper-2',
          onCitations ? 'text-ink' : 'text-ink-3',
        )}
      >
        <Quote className="h-3 w-3" />
        <span className="hidden sm:inline">Citations</span>
      </Link>
      {!onCitations && (mode === 'dump' || docId) && (
        <FocusToggle mode={mode} spaceId={spaceId} docId={docId} />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
          aria-label="Theme"
          title="Theme"
        >
          <ThemeIcon theme={theme} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {THEME_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onSelect={() => setTheme(opt.value)}
            >
              <Check
                className={cn(
                  'h-3.5 w-3.5',
                  theme === opt.value ? 'opacity-100' : 'opacity-0',
                )}
                aria-hidden
              />
              <span>{opt.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <MobileNavDrawer spaceId={spaceId} activeDocId={docId} />
    </header>
  );
}

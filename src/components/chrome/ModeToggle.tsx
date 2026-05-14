import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Mode = 'write' | 'focus' | 'read' | 'split' | 'dump';

interface ModeTabsProps {
  mode: Mode;
  spaceId: string;
  docId: string | null;
  fallbackDocId?: string | null;
}

type TabDef =
  | { key: 'write' | 'read' | 'split'; labelKey: string; suffix: string; perDoc: true }
  | { key: 'dump'; labelKey: string; perDoc: false };

const TABS: TabDef[] = [
  { key: 'write', labelKey: 'modeToggle.write', suffix: '', perDoc: true },
  { key: 'read', labelKey: 'modeToggle.read', suffix: '/read', perDoc: true },
  { key: 'split', labelKey: 'modeToggle.split', suffix: '/split', perDoc: true },
  { key: 'dump', labelKey: 'modeToggle.space', perDoc: false },
];

export function ModeTabs({ mode, spaceId, docId, fallbackDocId }: ModeTabsProps) {
  const { t } = useTranslation('chrome');
  const [searchParams] = useSearchParams();
  const focusParam = searchParams.get('focus');
  const withParam = searchParams.get('with');
  const effectiveDocId = docId ?? fallbackDocId ?? null;

  return (
    <nav className="inline-flex items-center gap-4 font-mono text-[11px]">
      {TABS.map((tab) => {
        if (tab.perDoc && !effectiveDocId) return null;
        const active =
          tab.key === mode || (mode === 'focus' && tab.key === 'write');
        const params = new URLSearchParams();
        if (focusParam) params.set('focus', focusParam);
        if (tab.key === 'split' && withParam) params.set('with', withParam);
        const qs = params.toString();
        const to = tab.perDoc
          ? `/s/${spaceId}/d/${effectiveDocId}${tab.suffix}${qs ? `?${qs}` : ''}`
          : `/s/${spaceId}/dump${focusParam ? '?focus=' + focusParam : ''}`;
        return (
          <Link
            key={tab.key}
            to={to}
            className={cn(
              'pb-0.5 transition-colors',
              active
                ? 'border-b border-ink font-medium text-ink'
                : 'text-ink-4 hover:text-ink-2',
              tab.key === 'split' && 'hidden md:inline',
            )}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

interface FocusToggleProps {
  mode: Mode;
  spaceId: string;
  docId: string | null;
}

export function FocusToggle({ mode, spaceId, docId }: FocusToggleProps) {
  const { t } = useTranslation('chrome');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const focused = searchParams.get('focus') === '1' || mode === 'focus';

  function basePathFor(m: Mode): string | null {
    if (m === 'dump') return `/s/${spaceId}/dump`;
    if (!docId) return null;
    if (m === 'split') return `/s/${spaceId}/d/${docId}/split`;
    return `/s/${spaceId}/d/${docId}`;
  }

  useEffect(() => {
    if (mode === 'read') return;
    const base = basePathFor(mode);
    if (!base) return;
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key !== '\\') return;
      e.preventDefault();
      const next = new URLSearchParams(searchParams);
      if (focused) {
        next.delete('focus');
      } else {
        next.set('focus', '1');
      }
      const qs = next.toString();
      navigate(`${base}${qs ? `?${qs}` : ''}`);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, spaceId, docId, navigate, searchParams, focused]);

  if (mode === 'read') return null;
  const base = basePathFor(mode);
  if (!base) return null;

  const next = new URLSearchParams(searchParams);
  if (focused) {
    next.delete('focus');
  } else {
    next.set('focus', '1');
  }
  const qs = next.toString();

  return (
    <Link
      to={`${base}${qs ? `?${qs}` : ''}`}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-3 hover:bg-paper-2 hover:text-ink"
      title={focused ? t('topbar.focusTitleNormal') : t('topbar.focusTitleFocus')}
      aria-label={focused ? t('topbar.exitFocus') : t('topbar.enterFocus')}
    >
      {focused ? (
        <>
          <Minimize2 className="h-3 w-3" />
          {t('topbar.normal')}
        </>
      ) : (
        <>
          <Maximize2 className="h-3 w-3" />
          {t('topbar.focus')}
        </>
      )}
    </Link>
  );
}

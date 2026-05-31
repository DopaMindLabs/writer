import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, type ComponentType, type SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Brain,
  Columns2,
  Maximize2,
  Minimize2,
  Pencil,
} from '@/components/libs/icons';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from '@/components/ui/Link';
import { routes } from '@/lib/routes';

export type Mode = 'write' | 'focus' | 'read' | 'split' | 'dump';

interface ModeTabsProps {
  mode: Mode;
  spaceId: string;
  docId: string | null;
  fallbackDocId?: string | null;
}

type TabKey = 'write' | 'read' | 'split' | 'dump';

type PerDocKey = 'write' | 'read' | 'split';
type DocBuilder = (spaceId: string, docId: string) => string;

const PER_DOC_BUILDERS: Record<PerDocKey, DocBuilder> = {
  write: routes.docWrite,
  read: routes.docRead,
  split: routes.docSplit,
};

type TabDef =
  | { key: PerDocKey; labelKey: string; perDoc: true }
  | { key: 'dump'; labelKey: string; perDoc: false };

const TABS: TabDef[] = [
  { key: 'write', labelKey: 'modeToggle.write', perDoc: true },
  { key: 'read', labelKey: 'modeToggle.read', perDoc: true },
  { key: 'split', labelKey: 'modeToggle.split', perDoc: true },
  { key: 'dump', labelKey: 'modeToggle.space', perDoc: false },
];

const TAB_ICONS: Record<TabKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  write: Pencil,
  read: BookOpen,
  split: Columns2,
  dump: Brain,
};

export const ModeTabs = ({ mode, spaceId, docId, fallbackDocId }: ModeTabsProps) => {
  const { t } = useTranslation('chrome');
  const [searchParams] = useSearchParams();
  const focusParam = searchParams.get('focus');
  const isFocus = focusParam === '1';
  const withParam = searchParams.get('with');
  const effectiveDocId = docId ?? fallbackDocId ?? null;

  return (
    <nav
      className={cn(
        'inline-flex items-center font-mono text-[11px]',
        isFocus ? 'gap-1' : 'gap-4',
      )}
    >
      {TABS.map((tab) => {
        if (tab.perDoc && !effectiveDocId) return null;
        const active =
          tab.key === mode || (mode === 'focus' && tab.key === 'write');
        const params = new URLSearchParams();
        if (focusParam) params.set('focus', focusParam);
        if (tab.key === 'split' && withParam) params.set('with', withParam);
        const qs = params.toString();
        const to = tab.perDoc
          ? `${PER_DOC_BUILDERS[tab.key](spaceId, effectiveDocId!)}${qs ? `?${qs}` : ''}`
          : `${routes.brainSpace(spaceId)}${focusParam ? '?focus=' + focusParam : ''}`;

        if (isFocus) {
          const Icon = TAB_ICONS[tab.key];
          const label = t(tab.labelKey);
          return (
            <Tooltip key={tab.key}>
              <TooltipTrigger asChild>
                <Link
                  to={to}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                    active
                      ? 'text-ink'
                      : 'text-ink-4 hover:bg-paper-2 hover:text-ink-2',
                    tab.key === 'split' && 'hidden md:inline-flex',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">{label}</TooltipContent>
            </Tooltip>
          );
        }

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
};

interface FocusToggleProps {
  mode: Mode;
  spaceId: string;
  docId: string | null;
}

export const FocusToggle = ({ mode, spaceId, docId }: FocusToggleProps) => {
  const { t } = useTranslation('chrome');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const focused = searchParams.get('focus') === '1' || mode === 'focus';

  const basePathFor = (m: Mode): string | null => {
    if (m === 'dump') return routes.brainSpace(spaceId);
    if (!docId) return null;
    if (m === 'split') return routes.docSplit(spaceId, docId);
    return routes.docWrite(spaceId, docId);
  };

  useEffect(() => {
    if (mode === 'read') return;
    const base = basePathFor(mode);
    if (!base) return;
    const onKey = (e: KeyboardEvent) => {
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
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
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

  if (focused) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            data-testid="focus-toggle"
            to={`${base}${qs ? `?${qs}` : ''}`}
            aria-label={t('topbar.exitFocus')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-paper-2 hover:text-ink"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t('topbar.focusTitleNormal')}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          data-testid="focus-toggle"
          to={`${base}${qs ? `?${qs}` : ''}`}
          title={t('topbar.focusTitleFocus')}
          aria-label={t('topbar.enterFocus')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">{t('topbar.focusTitleFocus')}</TooltipContent>
    </Tooltip>
  );
};

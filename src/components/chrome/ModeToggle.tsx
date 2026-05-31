import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, type ComponentType, type SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { invariant } from '@/lib/invariant';
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

interface ModeTabProps {
  tab: TabDef;
  to: string;
  active: boolean;
  isFocus: boolean;
  label: string;
}

const ModeTab = ({ tab, to, active, isFocus, label }: ModeTabProps) => {
  if (isFocus) {
    const Icon = TAB_ICONS[tab.key];
    return (
      <Tooltip>
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
      to={to}
      className={cn(
        'pb-0.5 transition-colors',
        active
          ? 'border-b border-ink font-medium text-ink'
          : 'text-ink-4 hover:text-ink-2',
        tab.key === 'split' && 'hidden md:inline',
      )}
    >
      {label}
    </Link>
  );
};

interface BuildTabHrefArgs {
  tab: TabDef;
  spaceId: string;
  effectiveDocId: string | null;
  focusParam: string | null;
  withParam: string | null;
}

const buildTabHref = ({
  tab,
  spaceId,
  effectiveDocId,
  focusParam,
  withParam,
}: BuildTabHrefArgs): string => {
  const params = new URLSearchParams();
  if (focusParam) params.set('focus', focusParam);
  if (tab.key === 'split' && withParam) params.set('with', withParam);
  const qs = params.toString();
  if (tab.perDoc) {
    invariant(effectiveDocId, 'per-doc tab requires a doc id');
    return `${PER_DOC_BUILDERS[tab.key](spaceId, effectiveDocId)}${qs ? `?${qs}` : ''}`;
  }
  return `${routes.brainSpace(spaceId)}${focusParam ? '?focus=' + focusParam : ''}`;
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
        const to = buildTabHref({ tab, spaceId, effectiveDocId, focusParam, withParam });
        return (
          <ModeTab
            key={tab.key}
            tab={tab}
            to={to}
            active={active}
            isFocus={isFocus}
            label={t(tab.labelKey)}
          />
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

const toggledFocusQs = (searchParams: URLSearchParams, focused: boolean): string => {
  const next = new URLSearchParams(searchParams);
  if (focused) {
    next.delete('focus');
  } else {
    next.set('focus', '1');
  }
  return next.toString();
};

interface FocusToggleLinkProps {
  to: string;
  focused: boolean;
}

const FocusToggleLink = ({ to, focused }: FocusToggleLinkProps) => {
  const { t } = useTranslation('chrome');
  if (focused) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            data-testid="focus-toggle"
            to={to}
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
          to={to}
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

export const FocusToggle = ({ mode, spaceId, docId }: FocusToggleProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const focused = searchParams.get('focus') === '1' || mode === 'focus';

  const basePathFor = useCallback(
    (m: Mode): string | null => {
      if (m === 'dump') return routes.brainSpace(spaceId);
      if (!docId) return null;
      if (m === 'split') return routes.docSplit(spaceId, docId);
      return routes.docWrite(spaceId, docId);
    },
    [spaceId, docId],
  );

  useEffect(() => {
    if (mode === 'read') return;
    const base = basePathFor(mode);
    if (!base) return;
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key !== '\\') return;
      e.preventDefault();
      const qs = toggledFocusQs(searchParams, focused);
      void navigate(`${base}${qs ? `?${qs}` : ''}`);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [mode, basePathFor, navigate, searchParams, focused]);

  if (mode === 'read') return null;
  const base = basePathFor(mode);
  if (!base) return null;

  const qs = toggledFocusQs(searchParams, focused);
  const to = `${base}${qs ? `?${qs}` : ''}`;

  return <FocusToggleLink to={to} focused={focused} />;
};

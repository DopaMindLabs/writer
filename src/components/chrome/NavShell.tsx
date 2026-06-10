import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Space } from '@/db/schema';
import { SpaceRail } from './SpaceRail';
import { NavTabs, type NavTabGroup } from './NavTabs';

type NavShellVariant = 'global' | 'space';

interface NavShellHeaderProps {
  variant: NavShellVariant;
  space: Space | null;
  subtitleOverride?: string;
}

const NavShellHeader = ({
  variant,
  space,
  subtitleOverride,
}: NavShellHeaderProps) => {
  const { t } = useTranslation('screens');
  const isSpace = variant === 'space';
  const title = isSpace ? space?.name ?? '…' : 'LIpsum Writer';
  const subtitle =
    subtitleOverride ??
    (isSpace ? t('settings.space.shellSubtitle') : t('settings.shellSubtitle'));
  const badge = isSpace ? space?.tag ?? '·' : 'L';

  return (
    <div className="flex items-center gap-3 border-b border-rule px-6 pb-4 pt-5">
      <div
        className={cn(
          'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md',
          isSpace
            ? 'bg-ink font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-paper'
            : 'border border-rule font-serif text-[16px] text-ink',
        )}
        aria-hidden
      >
        {badge}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-[20px] font-medium leading-none -tracking-[0.01em] text-ink">
          {title}
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.089em] text-ink-3">
          {subtitle}
        </div>
      </div>
    </div>
  );
};

interface NavShellProps {
  variant: NavShellVariant;
  groups: NavTabGroup[];
  active: string;
  onSelect: (id: string) => void;
  children: ReactNode;
  space?: Space | null;
  activeSpaceId?: string | null;
  /** Overrides the variant-derived nav header subtitle (e.g. for the Help shell). */
  subtitle?: string;
  /** Accessible name for the sub-nav landmark (defaults to the Settings wording). */
  navLabel?: string;
}

/**
 * Branded sidebar-nav + detail-pane shell shared by the Settings, Space settings
 * and Help surfaces: a left rail (SpaceRail + grouped {@link NavTabs}) beside a
 * scrollable content pane.
 */
export const NavShell = ({
  variant,
  groups,
  active,
  onSelect,
  children,
  space = null,
  activeSpaceId = null,
  subtitle,
  navLabel,
}: NavShellProps) => {
  return (
    <div className="flex h-full w-full bg-paper text-ink">
      <div className="hidden md:flex">
        <SpaceRail activeSpaceId={activeSpaceId} />
      </div>
      {/* min-w-0: without it the mobile tab strip's content width becomes the
          column's min-content width and forces the whole page to overflow
          horizontally on narrow viewports. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 min-w-0 shrink-0 flex-col border-r border-rule bg-paper-2 md:w-[240px]">
          <NavShellHeader
            variant={variant}
            space={space}
            subtitleOverride={subtitle}
          />
          <NavTabs
            groups={groups}
            active={active}
            onSelect={onSelect}
            label={navLabel}
          />
        </div>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-auto bg-paper"
        >
          <div className="max-w-[880px] px-4 pb-20 pt-6 md:px-12 md:pt-9">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

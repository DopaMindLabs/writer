import type { ReactNode } from 'react';
import type { Space } from '@/db/schema';
import { SpaceRail } from './SpaceRail';
import { NavShellHeader, type NavShellVariant } from './NavShellHeader';
import { NavTabs, type NavTabGroup } from './NavTabs';

interface NavShellProps {
  variant: NavShellVariant;
  groups: NavTabGroup[];
  active: string;
  onSelect: (id: string) => void;
  children: ReactNode;
  space?: Space | null;
  activeSpaceId?: string | null;
  subtitle?: string;
  navLabel?: string;
}

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

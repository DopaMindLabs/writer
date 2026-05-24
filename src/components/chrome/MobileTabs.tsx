import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil, BookOpen, Brain, Quote, MoreHorizontal } from '@/components/libs/icons';
import { useUI } from '@/store/ui';
import { cn } from '@/lib/utils';

interface MobileTabsProps {
  spaceId: string | null;
  docId?: string | null;
}

type TabKey = 'write' | 'read' | 'brain' | 'cite' | 'more';

interface TabItem {
  key: TabKey;
  Icon: typeof Pencil;
  href?: string;
  onClick?: () => void;
  match?: (pathname: string) => boolean;
}

export const MobileTabs = ({ spaceId, docId }: MobileTabsProps) => {
  const { t } = useTranslation('chrome');
  const location = useLocation();
  const setMobileMoreOpen = useUI((s) => s.setMobileMoreOpen);
  const openCitationsDrawer = useUI((s) => s.openCitationsDrawer);

  const writeHref =
    spaceId && docId ? `/s/${spaceId}/d/${docId}` : spaceId ? `/s/${spaceId}` : '/';
  const readHref = spaceId && docId ? `/s/${spaceId}/d/${docId}/read` : null;
  const brainHref = spaceId ? `/s/${spaceId}/dump` : null;

  const items: TabItem[] = [
    {
      key: 'write',
      Icon: Pencil,
      href: writeHref,
      match: (p) =>
        !p.endsWith('/read') &&
        !p.endsWith('/split') &&
        !p.endsWith('/dump') &&
        !p.endsWith('/citations'),
    },
    {
      key: 'read',
      Icon: BookOpen,
      href: readHref ?? undefined,
      match: (p) => p.endsWith('/read'),
    },
    {
      key: 'brain',
      Icon: Brain,
      href: brainHref ?? undefined,
      match: (p) => p.endsWith('/dump'),
    },
    {
      key: 'cite',
      Icon: Quote,
      onClick: () => openCitationsDrawer(),
      match: (p) => p.endsWith('/citations'),
    },
    {
      key: 'more',
      Icon: MoreHorizontal,
      onClick: () => setMobileMoreOpen(true),
    },
  ];

  return (
    <nav
      data-testid="mobile-tabs"
      aria-label={t('mobileTabs.write')}
      className="flex h-14 shrink-0 items-stretch border-t border-rule bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map((item) => {
        const active = item.match ? item.match(location.pathname) : false;
        const className = cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 px-1 transition-colors',
          active
            ? 'text-ink'
            : 'text-ink-3 hover:text-ink',
        );
        const inner = (
          <>
            <item.Icon className="h-4 w-4" aria-hidden />
            <span className="font-mono text-[9px] uppercase tracking-wider">
              {t(`mobileTabs.${item.key}`)}
            </span>
          </>
        );
        if (item.href) {
          return (
            <Link
              key={item.key}
              to={item.href}
              aria-current={active ? 'page' : undefined}
              className={className}
            >
              {inner}
            </Link>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            aria-pressed={active}
            className={className}
          >
            {inner}
          </button>
        );
      })}
    </nav>
  );
};

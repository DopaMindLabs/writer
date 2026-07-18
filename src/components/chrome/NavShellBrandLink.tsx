import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Space } from '@/db/schema';
import { routes } from '@/lib/routes';
import { Link } from '@/components/ui/Link';

interface NavShellBrandLinkProps {
  isSpace: boolean;
  space: Space | null;
}

const BADGE_BOX_CLASS =
  'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md';

const toneClass = (isSpace: boolean): string =>
  isSpace
    ? 'bg-ink font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-paper'
    : 'border border-rule font-serif text-[16px] text-ink';

/**
 * The shell-header badge doubles as the "back to root" affordance — essential
 * on mobile, where the SpaceRail (which carries its own home link) is hidden.
 * Global → Home; space → the space's Write view. While a space is still loading
 * there is no destination, so the badge stays decorative.
 */
export const NavShellBrandLink = ({ isSpace, space }: NavShellBrandLinkProps) => {
  const { t } = useTranslation('chrome');
  const badge = isSpace ? space?.tag ?? '·' : 'L';
  const spaceHref = space ? routes.spaceWrite(space.id) : null;
  const href = isSpace ? spaceHref : routes.home();

  if (!href) {
    return (
      <div className={cn(BADGE_BOX_CLASS, toneClass(isSpace))} aria-hidden>
        {badge}
      </div>
    );
  }

  const label = isSpace
    ? t('navShell.openSpace', { name: space?.name ?? '' })
    : t('navShell.home');

  return (
    <Link
      to={href}
      data-testid="nav-shell-home"
      aria-label={label}
      className={cn(
        BADGE_BOX_CLASS,
        toneClass(isSpace),
        'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink',
        isSpace ? 'hover:bg-ink-2' : 'hover:bg-paper',
      )}
    >
      {badge}
    </Link>
  );
};

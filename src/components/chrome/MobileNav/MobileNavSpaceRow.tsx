import { useTranslation } from 'react-i18next';
import type { Space } from '@/db/schema';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { Link } from '@/components/ui/Link';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';

interface MobileNavSpaceRowProps {
  space: Space;
  isActive: boolean;
}

/**
 * A full-width space row: the tag badge, the space name (visible, not a
 * hover-only tooltip as on the desktop rail) and a shared indicator. The whole
 * row is a ≥44 px tap target.
 */
export const MobileNavSpaceRow = ({ space, isActive }: MobileNavSpaceRowProps) => {
  const { t } = useTranslation('chrome');
  return (
    <Link
      to={routes.spaceWrite(space.id)}
      data-testid={`mobile-nav-space-${space.id}`}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink',
        isActive
          ? 'bg-paper text-ink'
          : 'text-ink-2 hover:bg-paper hover:text-ink active:bg-paper',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-medium tracking-wider',
          isActive ? 'bg-ink text-paper' : 'bg-paper-2 text-ink-2',
        )}
      >
        {space.tag}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
        {space.name}
      </span>
      {space.shared && (
        <>
          <span
            aria-hidden
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              isActive ? 'bg-ink' : 'bg-ink-3',
            )}
          />
          <VisuallyHidden>{t('mobileNav.shared')}</VisuallyHidden>
        </>
      )}
    </Link>
  );
};

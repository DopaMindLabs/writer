import { useTranslation } from 'react-i18next';
import { Plus } from '@/components/libs/icons';
import { useSpaces } from '@/hooks/useSpaces';
import { routes } from '@/lib/routes';
import { Link } from '@/components/ui/Link';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { MobileNavSpaceRow } from './MobileNavSpaceRow';

interface MobileNavSpacesProps {
  activeSpaceId: string;
}

/**
 * The full-width space switcher for the mobile nav drawer: a labelled, scrollable
 * list of named space rows plus a create-space row. Replaces the desktop rail's
 * tooltip-only tag tiles, which are unusable on touch.
 */
export const MobileNavSpaces = ({ activeSpaceId }: MobileNavSpacesProps) => {
  const { t } = useTranslation('chrome');
  const spaces = useSpaces();
  return (
    <div className="shrink-0 border-b border-rule py-1.5">
      <SectionLabel size={9} tone="ink4" className="px-3 pb-1 pt-1">
        {t('mobileNav.spaces')}
      </SectionLabel>
      <div className="max-h-56 overflow-y-auto overscroll-contain">
        {spaces.map((space) => (
          <MobileNavSpaceRow
            key={space.id}
            space={space}
            isActive={space.id === activeSpaceId}
          />
        ))}
      </div>
      <Link
        to={routes.templates()}
        data-testid="mobile-nav-create-space"
        className="flex min-h-11 items-center gap-3 px-3 py-2 text-ink-4 transition-colors hover:bg-paper hover:text-ink-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center">
          <Plus className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {t('mobileNav.createSpace')}
        </span>
      </Link>
    </div>
  );
};

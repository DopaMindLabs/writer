import { useTranslation } from 'react-i18next';
import { Library } from '@/components/libs/icons';
import { Link } from '@/components/ui/Link';
import { Icon } from '@/components/ui/icon';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

interface MediaLibraryLinkProps {
  spaceId: string;
  active: boolean;
}

export const MediaLibraryLink = ({ spaceId, active }: MediaLibraryLinkProps) => {
  const { t } = useTranslation('chrome');
  return (
    <Link
      to={routes.mediaLibrary(spaceId)}
      data-testid="sidebar-media-library-link"
      title={t('sidebar.mediaLibraryHint')}
      aria-current={active ? 'page' : undefined}
      className={cn(
        '-ml-px flex items-center gap-2 border-l-2 px-5 py-1.5 transition-colors',
        active
          ? 'border-ink bg-paper font-medium text-ink'
          : 'border-transparent text-ink-2 hover:bg-paper',
      )}
    >
      <span
        data-testid="sidebar-media-library-link-label"
        className="flex-1 text-[13px]"
      >
        {t('sidebar.mediaLibrary')}
      </span>
      <Icon icon={Library} size="xs" className="text-ink-4" />
    </Link>
  );
};

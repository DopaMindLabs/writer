import { useTranslation } from 'react-i18next';
import { Link } from '@/components/ui/Link';
import { Icon } from '@/components/ui/icon';
import { ArrowLeft } from '@/components/libs/icons';
import { routes } from '@/lib/routes';

interface ReaderBackLinkProps {
  spaceId: string;
}

/**
 * The reader's back affordance: a compact icon link to the media library, seated
 * at the left of the reader topbar. Icon-only (the label is the accessible name)
 * so it groups tightly with the thumbnail toggle beside it.
 */
export const ReaderBackLink = ({ spaceId }: ReaderBackLinkProps) => {
  const { t } = useTranslation('screens');
  return (
    <Link
      to={routes.mediaLibrary(spaceId)}
      kind="ghost"
      size="sm"
      data-testid="media-viewer-back"
      aria-label={t('mediaViewer.back')}
      className="inline-flex h-7 w-7 items-center justify-center"
    >
      <Icon icon={ArrowLeft} size="xs" />
    </Link>
  );
};

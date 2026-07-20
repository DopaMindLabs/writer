import { useTranslation } from 'react-i18next';
import { Link } from '@/components/ui/Link';
import { Icon } from '@/components/ui/icon';
import { ArrowLeft } from '@/components/libs/icons';
import { routes } from '@/lib/routes';

interface ReaderBackLinkProps {
  spaceId: string;
  /**
   * Overrides where back lands: a split pane keeps the library in-pane, so it
   * intercepts the navigation and swaps the pane instead. The href stays for
   * semantics; the click is captured.
   */
  onBack?: () => void;
}

/**
 * The reader's back affordance: a compact icon link to the media library, seated
 * at the left of the reader toolbar. Icon-only (the label is the accessible name)
 * so it groups tightly with the thumbnail toggle beside it.
 */
export const ReaderBackLink = ({ spaceId, onBack }: ReaderBackLinkProps) => {
  const { t } = useTranslation('screens');
  return (
    <Link
      to={routes.mediaLibrary(spaceId)}
      data-testid="media-viewer-back"
      aria-label={t('mediaViewer.back')}
      onClick={
        onBack
          ? (event) => {
              event.preventDefault();
              onBack();
            }
          : undefined
      }
      className="inline-flex h-7 w-7 items-center justify-center text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
    >
      <Icon icon={ArrowLeft} size="xs" />
    </Link>
  );
};

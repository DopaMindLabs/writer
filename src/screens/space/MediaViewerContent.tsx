import { useTranslation } from 'react-i18next';
import { Link } from '@/components/ui/Link';
import { Icon } from '@/components/ui/icon';
import { ArrowLeft } from '@/components/libs/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { PdfReaderSurface } from './PdfReaderSurface';
import { routes } from '@/lib/routes';
import type { PdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import type { MediaItem } from '@/db/schema';

interface MediaViewerContentProps {
  spaceId: string;
  /** `undefined` while loading, `null` when the item is gone, else the item. */
  item: MediaItem | null | undefined;
  /** The reader's lifted page/zoom state (owned by the screen so the crumb can read it). */
  view: PdfViewport;
}

/**
 * The viewer body: a back link plus the reader surface, or a "source removed"
 * empty state when the item is gone. Kept apart from the screen shell
 * (rail/sidebar/topbar) so each changes for one reason.
 */
export const MediaViewerContent = ({ spaceId, item, view }: MediaViewerContentProps) => {
  const { t } = useTranslation('screens');

  return (
    <>
      <div className="border-b border-rule px-4 py-2">
        <Link
          to={routes.mediaLibrary(spaceId)}
          kind="ghost"
          size="sm"
          data-testid="media-viewer-back"
          className="inline-flex items-center gap-1"
        >
          <Icon icon={ArrowLeft} size="xs" />
          {t('mediaViewer.back')}
        </Link>
      </div>
      {item === null ? (
        <div className="p-6">
          <EmptyState
            data-testid="media-viewer-missing"
            title={t('mediaViewer.missingTitle')}
            caption={t('mediaViewer.missingCaption')}
          />
        </div>
      ) : item ? (
        <PdfReaderSurface spaceId={spaceId} item={item} view={view} />
      ) : null}
    </>
  );
};

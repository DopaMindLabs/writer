import { useTranslation } from 'react-i18next';
import { Link } from '@/components/ui/Link';
import { Icon } from '@/components/ui/icon';
import { ArrowLeft } from '@/components/libs/icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { PdfViewer } from '@/components/pdf/PdfViewer/PdfViewer';
import { routes } from '@/lib/routes';
import type { MediaItem } from '@/db/schema';

interface MediaViewerContentProps {
  spaceId: string;
  /** `undefined` while loading, `null` when the item is gone, else the item. */
  item: MediaItem | null | undefined;
}

/**
 * The viewer body: a back link plus the PDF, or a "source removed" empty state
 * when the item is gone. Kept apart from the screen shell (rail/sidebar/topbar)
 * so each changes for one reason.
 */
export const MediaViewerContent = ({ spaceId, item }: MediaViewerContentProps) => {
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
        <div className="min-h-0 flex-1">
          <PdfViewer blob={item.blob} title={item.name} />
        </div>
      ) : null}
    </>
  );
};

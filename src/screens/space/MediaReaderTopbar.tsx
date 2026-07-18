import { useTranslation } from 'react-i18next';
import { Topbar } from '@/components/chrome/Topbar';
import { MediaReaderToolbar } from './MediaReaderToolbar';
import type { PdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import type { MediaItem } from '@/db/schema';

interface MediaReaderTopbarProps {
  spaceId: string;
  mediaId: string;
  item: MediaItem | null | undefined;
  spaceName?: string;
  fallbackDocId?: string | null;
  view: PdfViewport;
}

/**
 * The reader's top chrome: the shared Topbar exactly as on every other screen
 * (breadcrumb, page readout in the crumb, mode tabs), with the reader-specific
 * controls on a secondary grey toolbar beneath it ({@link MediaReaderToolbar}).
 * Kept apart from the screen so the screen owns layout and this owns the
 * read-mode chrome wiring.
 */
export const MediaReaderTopbar = ({
  spaceId,
  mediaId,
  item,
  spaceName,
  fallbackDocId,
  view,
}: MediaReaderTopbarProps) => {
  const { t } = useTranslation('screens');

  const crumbSuffix =
    item && view.numPages > 0
      ? t('pdfReader.crumbSuffix', { page: view.pageNumber, total: view.numPages })
      : undefined;

  return (
    <>
      <Topbar
        spaceId={spaceId}
        docId={null}
        docName={item?.name ?? t('mediaLibrary.title')}
        spaceName={spaceName}
        mode="read"
        fallbackDocId={fallbackDocId}
        crumbSuffix={crumbSuffix}
      />
      <MediaReaderToolbar spaceId={spaceId} mediaId={mediaId} hasItem={Boolean(item)} />
    </>
  );
};

import { useTranslation } from 'react-i18next';
import { Topbar } from '@/components/chrome/Topbar';
import { Files, PanelRight } from '@/components/libs/icons';
import { PdfReaderToggle } from '@/components/pdf/reader/PdfReaderToggle';
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
 * The reader's topbar: the shared chrome plus the two reader toggles and the page
 * readout in the crumb. Kept apart from the screen so the screen owns only the
 * layout and the lifted viewport, and this owns the read-mode chrome wiring.
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
    <Topbar
      spaceId={spaceId}
      docId={null}
      docName={item?.name ?? t('mediaLibrary.title')}
      spaceName={spaceName}
      mode="read"
      fallbackDocId={fallbackDocId}
      crumbSuffix={crumbSuffix}
      leading={
        item ? (
          <PdfReaderToggle
            mediaId={mediaId}
            icon={Files}
            label={t('pdfReader.thumbsToggle')}
            testId="pdf-thumbs-toggle"
            field="thumbs"
          />
        ) : undefined
      }
      trailing={
        item ? (
          <PdfReaderToggle
            mediaId={mediaId}
            icon={PanelRight}
            label={t('pdfReader.railToggle')}
            testId="pdf-rail-toggle"
            field="railHidden"
            invert
          />
        ) : undefined
      }
    />
  );
};

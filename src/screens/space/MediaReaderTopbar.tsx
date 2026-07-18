import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Topbar } from '@/components/chrome/Topbar';
import { Files, PanelRight } from '@/components/libs/icons';
import { PdfReaderToggle } from '@/components/pdf/reader/PdfReaderToggle';
import { PdfReaderFocusToggle } from '@/components/pdf/reader/PdfReaderFocusToggle';
import { ReaderBackLink } from './ReaderBackLink';
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
 * The reader's topbar: the shared chrome on a raised grey surface, with the back
 * link and page-thumbnail toggle grouped on the left, the page readout in the
 * crumb, and the panel + always-present focus toggles on the right. Focus mode
 * collapses the chrome, so the thumbnail and panel toggles fold away there —
 * only the back link and the (exit) focus toggle remain. Kept apart from the
 * screen so the screen owns layout and this owns the read-mode chrome wiring.
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
  const [searchParams] = useSearchParams();
  const focused = searchParams.get('focus') === '1';

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
      tone="paper-2"
      leading={
        <div className="flex items-center gap-1">
          <ReaderBackLink spaceId={spaceId} />
          {item && !focused ? (
            <PdfReaderToggle
              mediaId={mediaId}
              icon={Files}
              label={t('pdfReader.thumbsToggle')}
              testId="pdf-thumbs-toggle"
              field="thumbs"
            />
          ) : null}
        </div>
      }
      trailing={
        <div className="flex items-center gap-1">
          {item && !focused ? (
            <PdfReaderToggle
              mediaId={mediaId}
              icon={PanelRight}
              label={t('pdfReader.railToggle')}
              testId="pdf-rail-toggle"
              field="railHidden"
              invert
            />
          ) : null}
          {item ? <PdfReaderFocusToggle /> : null}
        </div>
      }
    />
  );
};

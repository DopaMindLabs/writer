import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Topbar } from '@/components/chrome/Topbar';
import { PanelRight } from '@/components/libs/icons';
import { PdfReaderToggle } from '@/components/pdf/reader/PdfReaderToggle';
import { PdfReaderFocusToggle } from '@/components/pdf/reader/PdfReaderFocusToggle';
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
 * The reader's top chrome: the shared Topbar as on every other screen
 * (breadcrumb, page readout in the crumb, mode tabs), with the reader's focus
 * and side-panel toggles in its right cluster — the same slots the doc screens
 * use for their focus and inspector toggles, so the side-panel affordance
 * persists across screens. Here the panel toggle drives the reader's vertical
 * glyph rail. The back link and thumbnail toggle sit on a secondary grey
 * toolbar beneath ({@link MediaReaderToolbar}). Kept apart from the screen so
 * the screen owns layout and this owns the read-mode chrome wiring.
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
    <>
      <Topbar
        spaceId={spaceId}
        docId={null}
        docName={item?.name ?? t('mediaLibrary.title')}
        spaceName={spaceName}
        mode="read"
        fallbackDocId={fallbackDocId}
        crumbSuffix={crumbSuffix}
        trailing={
          item ? (
            <div className="flex items-center gap-1">
              <PdfReaderFocusToggle />
              {!focused && (
                <PdfReaderToggle
                  mediaId={mediaId}
                  icon={PanelRight}
                  label={t('pdfReader.railToggle')}
                  testId="pdf-rail-toggle"
                  field="railHidden"
                  invert
                />
              )}
            </div>
          ) : undefined
        }
      />
      <MediaReaderToolbar spaceId={spaceId} mediaId={mediaId} hasItem={Boolean(item)} />
    </>
  );
};

import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Files, PanelRight } from '@/components/libs/icons';
import { PdfReaderToggle } from '@/components/pdf/reader/PdfReaderToggle';
import { PdfReaderFocusToggle } from '@/components/pdf/reader/PdfReaderFocusToggle';
import { ReaderBackLink } from './ReaderBackLink';

interface MediaReaderToolbarProps {
  spaceId: string;
  mediaId: string;
  /** The reader toggles only appear once the item has loaded. */
  hasItem: boolean;
}

/**
 * The reader's secondary toolbar: a slim grey bar under the shared topbar
 * carrying the read-mode chrome — the back link and page-thumbnail toggle on
 * the left, the panel and focus toggles on the right. The shared topbar above
 * it stays exactly as on every other screen; this bar owns everything
 * reader-specific. Focus mode folds the thumbnail and panel toggles away —
 * only the back link and the (exit) focus toggle remain, so it is always
 * reversible.
 */
export const MediaReaderToolbar = ({
  spaceId,
  mediaId,
  hasItem,
}: MediaReaderToolbarProps) => {
  const { t } = useTranslation('screens');
  const [searchParams] = useSearchParams();
  const focused = searchParams.get('focus') === '1';

  return (
    <div
      data-testid="media-reader-toolbar"
      className="flex h-9 shrink-0 items-center gap-1 border-b border-rule bg-paper-2 px-3 md:px-4"
    >
      <ReaderBackLink spaceId={spaceId} />
      {hasItem && !focused ? (
        <PdfReaderToggle
          mediaId={mediaId}
          icon={Files}
          label={t('pdfReader.thumbsToggle')}
          testId="pdf-thumbs-toggle"
          field="thumbs"
        />
      ) : null}
      <div className="flex-1" />
      {hasItem && !focused ? (
        <PdfReaderToggle
          mediaId={mediaId}
          icon={PanelRight}
          label={t('pdfReader.railToggle')}
          testId="pdf-rail-toggle"
          field="railHidden"
          invert
        />
      ) : null}
      {hasItem ? <PdfReaderFocusToggle /> : null}
    </div>
  );
};

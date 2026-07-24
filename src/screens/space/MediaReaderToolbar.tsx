import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Files } from '@/components/libs/icons';
import { PdfReaderToggle } from '@/components/pdf/reader/PdfReaderToggle';
import { ReaderBackLink } from './ReaderBackLink';

interface MediaReaderToolbarProps {
  spaceId: string;
  mediaId: string;
  /** The reader toggles only appear once the item has loaded. */
  hasItem: boolean;
  /** Overrides where back lands (see {@link ReaderBackLink}). */
  onBack?: () => void;
}

/**
 * The reader's secondary toolbar: a slim grey bar under the shared topbar with
 * the back link and the page-thumbnail toggle. The panel and focus toggles
 * live in the shared topbar's right cluster (the same slots the doc screens
 * use), so this bar owns only the left-hand reader affordances. Focus mode
 * folds the thumbnail toggle away — the back link remains.
 */
export const MediaReaderToolbar = ({
  spaceId,
  mediaId,
  hasItem,
  onBack,
}: MediaReaderToolbarProps) => {
  const { t } = useTranslation('screens');
  const [searchParams] = useSearchParams();
  const focused = searchParams.get('focus') === '1';

  return (
    <div
      data-testid="media-reader-toolbar"
      className="flex h-9 shrink-0 items-center gap-1 border-b border-rule bg-paper-2 px-3 md:px-4"
    >
      <ReaderBackLink spaceId={spaceId} onBack={onBack} />
      {hasItem && !focused ? (
        <PdfReaderToggle
          mediaId={mediaId}
          icon={Files}
          label={t('pdfReader.thumbsToggle')}
          testId="pdf-thumbs-toggle"
          field="thumbs"
        />
      ) : null}
    </div>
  );
};

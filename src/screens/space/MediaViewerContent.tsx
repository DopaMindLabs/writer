import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { PdfReaderSurface } from './PdfReaderSurface';
import type { PdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import type { MediaItem } from '@/db/schema';

interface MediaViewerContentProps {
  spaceId: string;
  /** `undefined` while loading, `null` when the item is gone, else the item. */
  item: MediaItem | null | undefined;
  /** The reader's lifted page/zoom state (owned by the screen so the crumb can read it). */
  view: PdfViewport;
  /** Focus mode hides the reader's side chrome so the page owns the room. */
  focused?: boolean;
}

/**
 * The viewer body: the reader surface, or a "source removed" empty state when the
 * item is gone. The back link lives in the topbar now; this owns only the page
 * surface and the empty states, so each changes for one reason.
 */
export const MediaViewerContent = ({
  spaceId,
  item,
  view,
  focused = false,
}: MediaViewerContentProps) => {
  const { t } = useTranslation('screens');

  if (item === null) {
    return (
      <div className="p-6">
        <EmptyState
          data-testid="media-viewer-missing"
          title={t('mediaViewer.missingTitle')}
          caption={t('mediaViewer.missingCaption')}
        />
      </div>
    );
  }
  if (!item) return null;
  return <PdfReaderSurface spaceId={spaceId} item={item} view={view} focused={focused} />;
};

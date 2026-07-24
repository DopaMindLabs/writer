import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import { useMediaItem } from '@/hooks/useMediaItem';
import { MediaReaderToolbar } from './MediaReaderToolbar';
import { PdfReaderSurface } from './PdfReaderSurface';

interface SplitMediaPaneProps {
  spaceId: string;
  mediaId: string;
  /** Returns the pane to the library list (the pane stays a pane throughout). */
  onBackToLibrary: () => void;
}

/**
 * A PDF opened inside the split view's right pane: the same grey reader
 * toolbar as the full-page reader (icon back + thumbnail toggle — back swaps
 * the pane rather than navigating), then the full reader surface — so opening
 * a document from the library pane never leaves the split. Owns its own
 * viewport (the pane has no topbar crumb to feed).
 */
export const SplitMediaPane = ({
  spaceId,
  mediaId,
  onBackToLibrary,
}: SplitMediaPaneProps) => {
  const { t } = useTranslation('screens');
  const item = useMediaItem(mediaId);
  const view = usePdfViewport();

  if (item === undefined) return null;

  if (item === null) {
    return (
      <div data-testid="split-media-missing" className="flex h-full min-h-0 flex-col">
        <MediaReaderToolbar
          spaceId={spaceId}
          mediaId={mediaId}
          hasItem={false}
          onBack={onBackToLibrary}
        />
        <div className="p-6">
          <EmptyState
            title={t('mediaViewer.missingTitle')}
            caption={t('mediaViewer.missingCaption')}
          />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="split-media-pane" className="flex h-full min-h-0 flex-col">
      <MediaReaderToolbar
        spaceId={spaceId}
        mediaId={mediaId}
        hasItem
        onBack={onBackToLibrary}
      />
      <PdfReaderSurface spaceId={spaceId} item={item} view={view} />
    </div>
  );
};

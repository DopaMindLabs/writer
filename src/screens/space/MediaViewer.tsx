import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { MobileTabs } from '@/components/chrome/MobileTabs';
import { MobileMoreSheet } from '@/components/chrome/MobileMoreSheet';
import { MediaViewerContent } from './MediaViewerContent';
import { MediaReaderTopbar } from './MediaReaderTopbar';
import { usePdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import { useMediaItem } from '@/hooks/useMediaItem';
import { useSpace } from '@/hooks/useSpaces';
import { useUI } from '@/store/ui';
import { routes } from '@/lib/routes';

/**
 * Deep-linkable PDF reader for one library item. Owns the lifted page/zoom state
 * (so the crumb, pager and chrome memory share one source), collapses the space
 * sidebar so the page owns the room, and shows a "source removed" empty state if
 * the item is gone.
 */
export const MediaViewerScreen = () => {
  const { spaceId, mediaId } = useParams<{ spaceId: string; mediaId: string }>();
  const space = useSpace(spaceId);
  const item = useMediaItem(mediaId);
  const lastDocId = useUI((s) => s.currentDocId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);
  const view = usePdfViewport();

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  if (!spaceId || !mediaId) return <Navigate to={routes.home()} replace />;

  return (
    <div className="flex h-full w-full">
      {/* Reader owns the room: the space sidebar collapses (design Frame C), only
          the SpaceRail stays. Mobile chrome is untouched. */}
      <div className="hidden md:contents">
        <SpaceRail activeSpaceId={spaceId} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <MediaReaderTopbar
          spaceId={spaceId}
          mediaId={mediaId}
          item={item}
          spaceName={space?.name}
          fallbackDocId={lastDocId}
          view={view}
        />
        <main
          id="main-content"
          tabIndex={-1}
          data-testid="media-viewer-screen"
          className="flex min-h-0 flex-1 flex-col bg-paper"
        >
          <MediaViewerContent spaceId={spaceId} item={item} view={view} />
        </main>
        <MobileTabs spaceId={spaceId} docId={lastDocId} />
        <MobileMoreSheet spaceId={spaceId} docId={lastDocId} />
      </div>
    </div>
  );
};

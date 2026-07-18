import { useEffect } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { MobileTabs } from '@/components/chrome/MobileTabs';
import { MobileMoreSheet } from '@/components/chrome/MobileMoreSheet';
import { MediaViewerContent } from './MediaViewerContent';
import { MediaReaderTopbar } from './MediaReaderTopbar';
import { usePdfViewport } from '@/components/pdf/PdfViewer/usePdfViewport';
import { useMediaItem } from '@/hooks/useMediaItem';
import { useSpace } from '@/hooks/useSpaces';
import { useUI } from '@/store/ui';
import { markMediaOpened } from '@/lib/media';
import { routes } from '@/lib/routes';

/**
 * Deep-linkable PDF reader for one library item. Owns the lifted page/zoom state
 * (so the crumb, pager and chrome memory share one source), collapses the space
 * sidebar so the page owns the room, and shows a "source removed" empty state if
 * the item is gone.
 */
export const MediaViewerScreen = () => {
  const { spaceId, mediaId } = useParams<{ spaceId: string; mediaId: string }>();
  const [searchParams] = useSearchParams();
  const focused = searchParams.get('focus') === '1';
  const space = useSpace(spaceId);
  const item = useMediaItem(mediaId);
  const lastDocId = useUI((s) => s.currentDocId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);
  const view = usePdfViewport();
  // A primitive id (not the item object) keys the mark-opened effect: the item
  // re-emits on every live-query change, but its id is stable, so opening stamps
  // `openedAt` exactly once — the stamp's own write never re-triggers it.
  const loadedMediaId = item?.id;

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  useEffect(() => {
    if (loadedMediaId) void markMediaOpened(loadedMediaId);
  }, [loadedMediaId]);

  if (!spaceId || !mediaId) return <Navigate to={routes.home()} replace />;

  return (
    <div className="flex h-full w-full">
      {/* Reader owns the room: the space sidebar collapses (design Frame C), only
          the SpaceRail stays — and in focus mode even that folds away so the page
          owns the whole width. Mobile chrome is untouched. */}
      {!focused && (
        <div className="hidden md:contents">
          <SpaceRail activeSpaceId={spaceId} />
        </div>
      )}
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
          <MediaViewerContent spaceId={spaceId} item={item} view={view} focused={focused} />
        </main>
        <MobileTabs spaceId={spaceId} docId={lastDocId} />
        <MobileMoreSheet spaceId={spaceId} docId={lastDocId} />
      </div>
    </div>
  );
};

import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Topbar } from '@/components/chrome/Topbar';
import { MobileTabs } from '@/components/chrome/MobileTabs';
import { MobileMoreSheet } from '@/components/chrome/MobileMoreSheet';
import { MediaViewerContent } from './MediaViewerContent';
import { useMediaItem } from '@/hooks/useMediaItem';
import { useSpace } from '@/hooks/useSpaces';
import { useUI } from '@/store/ui';
import { routes } from '@/lib/routes';

/**
 * Deep-linkable PDF viewer for one library item. Loads the item live, shows a
 * "source removed" empty state if it is gone, and otherwise renders the viewer
 * with a back link to the library.
 */
export const MediaViewerScreen = () => {
  const { t } = useTranslation('screens');
  const { spaceId, mediaId } = useParams<{ spaceId: string; mediaId: string }>();
  const space = useSpace(spaceId);
  const item = useMediaItem(mediaId);
  const lastDocId = useUI((s) => s.currentDocId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);

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
        <Topbar
          spaceId={spaceId}
          docId={null}
          docName={item?.name ?? t('mediaLibrary.title')}
          spaceName={space?.name}
          mode="read"
          fallbackDocId={lastDocId}
        />
        <main
          id="main-content"
          tabIndex={-1}
          data-testid="media-viewer-screen"
          className="flex min-h-0 flex-1 flex-col bg-paper"
        >
          <MediaViewerContent spaceId={spaceId} item={item} />
        </main>
        <MobileTabs spaceId={spaceId} docId={lastDocId} />
        <MobileMoreSheet spaceId={spaceId} docId={lastDocId} />
      </div>
    </div>
  );
};

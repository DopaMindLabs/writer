import { Navigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { Topbar } from '@/components/chrome/Topbar';
import { MobileTabs } from '@/components/chrome/MobileTabs';
import { MobileMoreSheet } from '@/components/chrome/MobileMoreSheet';
import { useSpace } from '@/hooks/useSpaces';
import { useUI } from '@/store/ui';
import { MediaLibrarySurface } from '@/components/surfaces/MediaLibrary/MediaLibrarySurface';
import { routes } from '@/lib/routes';

export const MediaLibraryScreen = () => {
  const { t } = useTranslation('screens');
  const { spaceId } = useParams<{ spaceId: string }>();
  const space = useSpace(spaceId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);
  const lastDocId = useUI((s) => s.currentDocId);

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  if (!spaceId) return <Navigate to={routes.home()} replace />;

  return (
    <div className="flex h-full w-full">
      <div className="hidden md:contents">
        <SpaceRail activeSpaceId={spaceId} />
        <Sidebar spaceId={spaceId} activeDocId={lastDocId} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          spaceId={spaceId}
          docId={null}
          docName={t('media.title')}
          spaceName={space?.name}
          mode="write"
          fallbackDocId={lastDocId}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col overflow-hidden bg-paper"
        >
          <MediaLibrarySurface spaceId={spaceId} />
        </main>
        <MobileTabs spaceId={spaceId} docId={lastDocId} />
        <MobileMoreSheet spaceId={spaceId} docId={lastDocId} />
      </div>
    </div>
  );
};

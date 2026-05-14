import { Navigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Topbar } from '@/components/chrome/Topbar';
import { useSpace } from '@/hooks/useSpaces';
import { useUI } from '@/store/ui';
import { CitationsPane } from '@/components/surfaces/CitationsPane';

export function CitationsScreen() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const space = useSpace(spaceId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  if (!spaceId) return <Navigate to="/" replace />;

  return (
    <div className="flex h-full w-full">
      <div className="hidden md:contents">
        <SpaceRail activeSpaceId={spaceId} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          spaceId={spaceId}
          docId={null}
          docName="Citations"
          spaceName={space?.name}
          mode="write"
        />
        <main className="flex flex-1 flex-col overflow-hidden bg-paper">
          <CitationsPane
            spaceId={spaceId}
            spaceName={space?.name}
            density="comfortable"
          />
        </main>
      </div>
    </div>
  );
}

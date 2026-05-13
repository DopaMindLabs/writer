import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { DumpCanvas } from '@/components/surfaces/DumpCanvas';
import { useSpace } from '@/hooks/useSpaces';
import { useNotes } from '@/hooks/useNotes';
import { useUI } from '@/store/ui';

export function DumpScreen() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get('focus') === '1';
  const space = useSpace(spaceId);
  const notes = useNotes(spaceId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);
  const setCurrentDocId = useUI((s) => s.setCurrentDocId);

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  useEffect(() => {
    setCurrentDocId(null);
  }, [setCurrentDocId]);

  if (!spaceId) return <Navigate to="/" replace />;

  return (
    <div className="flex h-full w-full">
      {focus ? (
        <FocusRail activeSpaceId={spaceId} />
      ) : (
        <>
          <SpaceRail activeSpaceId={spaceId} />
          <Sidebar spaceId={spaceId} activeDocId={null} />
        </>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          spaceId={spaceId}
          docId={null}
          docName={`Brain dump · ${notes.length} unsorted`}
          spaceName={space?.name}
          mode="dump"
        />
        <main className="flex-1 overflow-hidden">
          <DumpCanvas spaceId={spaceId} />
        </main>
      </div>
    </div>
  );
}

import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { WorldRail } from '@/components/chrome/WorldRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { DumpCanvas } from '@/components/surfaces/DumpCanvas';
import { useWorld } from '@/hooks/useWorlds';
import { useNotes } from '@/hooks/useNotes';
import { useUI } from '@/store/ui';

export function DumpScreen() {
  const { worldId } = useParams<{ worldId: string }>();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get('focus') === '1';
  const world = useWorld(worldId);
  const notes = useNotes(worldId);
  const setCurrentWorldId = useUI((s) => s.setCurrentWorldId);
  const setCurrentDocId = useUI((s) => s.setCurrentDocId);

  useEffect(() => {
    if (worldId) setCurrentWorldId(worldId);
  }, [worldId, setCurrentWorldId]);

  useEffect(() => {
    setCurrentDocId(null);
  }, [setCurrentDocId]);

  if (!worldId) return <Navigate to="/" replace />;

  return (
    <div className="flex h-full w-full">
      {focus ? (
        <FocusRail activeWorldId={worldId} />
      ) : (
        <>
          <WorldRail activeWorldId={worldId} />
          <Sidebar worldId={worldId} activeDocId={null} />
        </>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          worldId={worldId}
          docId={null}
          docName={`Brain dump · ${notes.length} unsorted`}
          worldName={world?.name}
          mode="dump"
        />
        <main className="flex-1 overflow-hidden">
          <DumpCanvas worldId={worldId} />
        </main>
      </div>
    </div>
  );
}

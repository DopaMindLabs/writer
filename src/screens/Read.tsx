import { Navigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { WriteSurface } from '@/components/surfaces/WriteSurface';
import { useWorld } from '@/hooks/useWorlds';
import { useDocument } from '@/hooks/useDocuments';
import { useUI } from '@/store/ui';

export function ReadScreen() {
  const { worldId, docId } = useParams<{ worldId: string; docId: string }>();
  const world = useWorld(worldId);
  const doc = useDocument(docId);
  const setCurrentWorldId = useUI((s) => s.setCurrentWorldId);
  const setCurrentDocId = useUI((s) => s.setCurrentDocId);

  useEffect(() => {
    if (worldId) setCurrentWorldId(worldId);
  }, [worldId, setCurrentWorldId]);

  useEffect(() => {
    if (docId) setCurrentDocId(docId);
  }, [docId, setCurrentDocId]);

  if (!worldId || !docId) return <Navigate to="/" replace />;

  return (
    <div className="flex h-full w-full">
      <FocusRail activeWorldId={worldId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          worldId={worldId}
          docId={docId}
          docName={doc?.name}
          worldName={world?.name}
          mode="read"
        />
        <main className="flex-1 overflow-hidden">
          {doc && <WriteSurface doc={doc} mode="read" />}
        </main>
      </div>
    </div>
  );
}

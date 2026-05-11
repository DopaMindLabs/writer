import { Navigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { WorldRail } from '@/components/chrome/WorldRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { Topbar } from '@/components/chrome/Topbar';
import { WriteSurface } from '@/components/surfaces/WriteSurface';
import { useWorld } from '@/hooks/useWorlds';
import { useSections, useDocuments, useDocument } from '@/hooks/useDocuments';
import { useUI } from '@/store/ui';

export function WriteScreen() {
  const { worldId, docId } = useParams<{ worldId: string; docId?: string }>();
  const world = useWorld(worldId);
  const sections = useSections(worldId);
  const docs = useDocuments(worldId);
  const doc = useDocument(docId);
  const setCurrentWorldId = useUI((s) => s.setCurrentWorldId);
  const setCurrentDocId = useUI((s) => s.setCurrentDocId);

  useEffect(() => {
    if (worldId) setCurrentWorldId(worldId);
  }, [worldId, setCurrentWorldId]);

  useEffect(() => {
    setCurrentDocId(docId ?? null);
  }, [docId, setCurrentDocId]);

  if (!worldId) return <Navigate to="/" replace />;

  if (!docId && sections.length > 0 && docs.length > 0) {
    const firstSection = sections[0];
    const firstDoc = docs.find((d) => d.sectionId === firstSection.id) ?? docs[0];
    if (firstDoc) return <Navigate to={`/w/${worldId}/d/${firstDoc.id}`} replace />;
  }

  return (
    <div className="flex h-full w-full">
      <WorldRail activeWorldId={worldId} />
      <Sidebar worldId={worldId} activeDocId={docId ?? null} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          worldId={worldId}
          docId={docId ?? null}
          docName={doc?.name}
          worldName={world?.name}
          mode="normal"
        />
        <main className="flex-1 overflow-hidden">
          {doc ? (
            <WriteSurface doc={doc} mode="normal" />
          ) : (
            <EmptyState worldId={worldId} />
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState({ worldId: _ }: { worldId: string }) {
  return (
    <div className="flex h-full items-center justify-center text-ink-3">
      <div className="text-center">
        <p className="font-serif text-2xl text-ink">Empty world</p>
        <p className="mt-2 text-sm">Pick a document from the sidebar to start writing.</p>
      </div>
    </div>
  );
}

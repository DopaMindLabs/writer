import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { WriteSurface } from '@/components/surfaces/WriteSurface';
import { CitationsSidePanel } from '@/components/surfaces/CitationsSidePanel';
import { useSpace } from '@/hooks/useSpaces';
import { useSections, useDocuments, useDocument } from '@/hooks/useDocuments';
import { useUI } from '@/store/ui';

export function WriteScreen() {
  const { spaceId, docId } = useParams<{ spaceId: string; docId?: string }>();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get('focus') === '1';
  const space = useSpace(spaceId);
  const sections = useSections(spaceId);
  const docs = useDocuments(spaceId);
  const doc = useDocument(docId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);
  const setCurrentDocId = useUI((s) => s.setCurrentDocId);

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  useEffect(() => {
    setCurrentDocId(docId ?? null);
  }, [docId, setCurrentDocId]);

  if (!spaceId) return <Navigate to="/" replace />;

  if (!docId && sections.length > 0 && docs.length > 0) {
    const orderedSections = [...sections].sort((a, b) => a.order - b.order);
    const firstSection =
      orderedSections.find((s) => s.parentSectionId === null) ??
      orderedSections[0];
    const firstDoc = docs.find((d) => d.sectionId === firstSection.id) ?? docs[0];
    if (firstDoc) return <Navigate to={`/s/${spaceId}/d/${firstDoc.id}`} replace />;
  }

  const editorMode = focus ? 'focus' : 'write';

  return (
    <div className="flex h-full w-full">
      <div className="hidden md:contents">
        {focus ? (
          <FocusRail activeSpaceId={spaceId} />
        ) : (
          <>
            <SpaceRail activeSpaceId={spaceId} />
            <Sidebar spaceId={spaceId} activeDocId={docId ?? null} />
          </>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          spaceId={spaceId}
          docId={docId ?? null}
          docName={doc?.name}
          spaceName={space?.name}
          mode={editorMode}
        />
        <main className="flex flex-1 overflow-hidden">
          {doc ? (
            <WriteSurface doc={doc} mode={editorMode} />
          ) : (
            <EmptyState />
          )}
          <CitationsSidePanel spaceId={spaceId} />
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-w-0 flex-1 items-center justify-center text-ink-3">
      <div className="text-center">
        <p className="font-serif text-2xl text-ink">Empty space</p>
        <p className="mt-2 text-sm">Pick a document from the sidebar to start writing.</p>
      </div>
    </div>
  );
}

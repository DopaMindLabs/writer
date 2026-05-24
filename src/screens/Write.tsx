import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { WriteSurface } from '@/components/surfaces/WriteSurface';
import { CitationsSidePanel } from '@/components/surfaces/CitationsSidePanel';
import { DocInspector } from '@/components/chrome/DocInspector';
import { DocInspectorIcons } from '@/components/chrome/DocInspectorIcons';
import { MobileTabs } from '@/components/chrome/MobileTabs';
import { MobileMoreSheet } from '@/components/chrome/MobileMoreSheet';
import { useSpace } from '@/hooks/useSpaces';
import { useSections, useDocuments, useDocument } from '@/hooks/useDocuments';
import { useUI } from '@/store/ui';
import { TypographyMuted, TypographyP } from '@/components/ui/typography';
import { useAutoTour } from '@/tours';

export const WriteScreen = () => {
  const { spaceId, docId } = useParams<{ spaceId: string; docId?: string }>();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get('focus') === '1';
  const space = useSpace(spaceId);
  const sections = useSections(spaceId);
  const docs = useDocuments(spaceId);
  const doc = useDocument(docId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);
  const setCurrentDocId = useUI((s) => s.setCurrentDocId);
  const citationsDrawerOpen = useUI((s) => s.citationsDrawerOpen);
  const inspectorMode = useUI((s) => s.inspectorMode);
  const inspectorVisible =
    !focus && inspectorMode !== 'none' && !!doc && !citationsDrawerOpen;
  const showInspectorExpanded = inspectorVisible && inspectorMode === 'expanded';
  const showInspectorIcons = inspectorVisible && inspectorMode === 'icons';

  useAutoTour('writer', { ready: !focus && !!doc });

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
          {showInspectorIcons && doc && <DocInspectorIcons />}
          {showInspectorExpanded && doc && <DocInspector docName={doc.name} />}
        </main>
        {!focus && (
          <>
            <MobileTabs spaceId={spaceId} docId={docId ?? null} />
            <MobileMoreSheet spaceId={spaceId} docId={docId ?? null} />
          </>
        )}
      </div>
    </div>
  );
};

const EmptyState = () => {
  return (
    <div className="flex h-full min-w-0 flex-1 items-center justify-center text-ink-3">
      <div className="text-center">
        <TypographyP variant="empty">Empty space</TypographyP>
        <TypographyMuted className="mt-2">
          Pick a document from the sidebar to start writing.
        </TypographyMuted>
      </div>
    </div>
  );
};

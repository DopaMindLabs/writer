import { Navigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { WriteSurface } from '@/components/surfaces/WriteSurface';
import { CitationsSidePanel } from '@/components/surfaces/CitationsSidePanel';
import { DocInspector } from '@/components/chrome/DocInspector';
import { DocInspectorIcons } from '@/components/chrome/DocInspectorIcons';
import { MobileTabs } from '@/components/chrome/MobileTabs';
import { MobileMoreSheet } from '@/components/chrome/MobileMoreSheet';
import { useSpace } from '@/hooks/useSpaces';
import { useDocument } from '@/hooks/useDocuments';
import { useUI, type InspectorMode } from '@/store/ui';
import type { Doc } from '@/db/schema';
import { routes } from '@/lib/routes';

export const ReadScreen = () => {
  const { spaceId, docId } = useParams<{ spaceId: string; docId: string }>();
  const space = useSpace(spaceId);
  const doc = useDocument(docId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);
  const setCurrentDocId = useUI((s) => s.setCurrentDocId);
  const citationsDrawerOpen = useUI((s) => s.citationsDrawerOpen);
  const inspectorMode = useUI((s) => s.inspectorMode);

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  useEffect(() => {
    if (docId) setCurrentDocId(docId);
  }, [docId, setCurrentDocId]);

  if (!spaceId || !docId) return <Navigate to={routes.home()} replace />;

  return (
    <div className="flex h-full w-full">
      <div className="hidden md:contents">
        <FocusRail activeSpaceId={spaceId} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          spaceId={spaceId}
          docId={docId}
          docName={doc?.name}
          spaceName={space?.name}
          mode="read"
        />
        <main id="main-content" tabIndex={-1} className="flex flex-1 overflow-hidden">
          {doc && <WriteSurface doc={doc} mode="read" />}
          <CitationsSidePanel spaceId={spaceId} />
          <ReadInspector
            doc={doc}
            inspectorMode={inspectorMode}
            citationsDrawerOpen={citationsDrawerOpen}
          />
        </main>
        <MobileTabs spaceId={spaceId} docId={docId} />
        <MobileMoreSheet spaceId={spaceId} docId={docId} />
      </div>
    </div>
  );
};

const ReadInspector = ({
  doc,
  inspectorMode,
  citationsDrawerOpen,
}: {
  doc: Doc | undefined;
  inspectorMode: InspectorMode;
  citationsDrawerOpen: boolean;
}) => {
  if (!doc || citationsDrawerOpen || inspectorMode === 'none') return null;
  // Versioning is a write-surface concern; hide the History tab while reading.
  if (inspectorMode === 'icons') return <DocInspectorIcons hideHistory />;
  return (
    <DocInspector docName={doc.name} docId={doc.id} hideHistory readOnly />
  );
};

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
import { useUI } from '@/store/ui';

export const ReadScreen = () => {
  const { spaceId, docId } = useParams<{ spaceId: string; docId: string }>();
  const space = useSpace(spaceId);
  const doc = useDocument(docId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);
  const setCurrentDocId = useUI((s) => s.setCurrentDocId);
  const citationsDrawerOpen = useUI((s) => s.citationsDrawerOpen);
  const inspectorMode = useUI((s) => s.inspectorMode);
  const inspectorVisible =
    inspectorMode !== 'none' && !!doc && !citationsDrawerOpen;
  const showInspectorExpanded = inspectorVisible && inspectorMode === 'expanded';
  const showInspectorIcons = inspectorVisible && inspectorMode === 'icons';

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  useEffect(() => {
    if (docId) setCurrentDocId(docId);
  }, [docId, setCurrentDocId]);

  if (!spaceId || !docId) return <Navigate to="/" replace />;

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
        <main className="flex flex-1 overflow-hidden">
          {doc && <WriteSurface doc={doc} mode="read" />}
          <CitationsSidePanel spaceId={spaceId} />
          {showInspectorIcons && doc && <DocInspectorIcons />}
          {showInspectorExpanded && doc && <DocInspector docName={doc.name} />}
        </main>
        <MobileTabs spaceId={spaceId} docId={docId ?? null} />
        <MobileMoreSheet spaceId={spaceId} docId={docId ?? null} />
      </div>
    </div>
  );
};

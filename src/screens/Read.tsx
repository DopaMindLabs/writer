import { Navigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { WriteSurface } from '@/components/surfaces/WriteSurface';
import { useSpace } from '@/hooks/useSpaces';
import { useDocument } from '@/hooks/useDocuments';
import { useUI } from '@/store/ui';

export function ReadScreen() {
  const { spaceId, docId } = useParams<{ spaceId: string; docId: string }>();
  const space = useSpace(spaceId);
  const doc = useDocument(docId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);
  const setCurrentDocId = useUI((s) => s.setCurrentDocId);

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  useEffect(() => {
    if (docId) setCurrentDocId(docId);
  }, [docId, setCurrentDocId]);

  if (!spaceId || !docId) return <Navigate to="/" replace />;

  return (
    <div className="flex h-full w-full">
      <FocusRail activeSpaceId={spaceId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          spaceId={spaceId}
          docId={docId}
          docName={doc?.name}
          spaceName={space?.name}
          mode="read"
        />
        <main className="flex-1 overflow-hidden">
          {doc && <WriteSurface doc={doc} mode="read" />}
        </main>
      </div>
    </div>
  );
}

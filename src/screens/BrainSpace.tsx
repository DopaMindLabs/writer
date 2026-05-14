import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { DumpCanvas } from '@/components/surfaces/DumpCanvas';
import { useSpace } from '@/hooks/useSpaces';
import { useDocuments } from '@/hooks/useDocuments';
import { useNotes } from '@/hooks/useNotes';
import { useUI } from '@/store/ui';

export function DumpScreen() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get('focus') === '1';
  const space = useSpace(spaceId);
  const notes = useNotes(spaceId);
  const docs = useDocuments(spaceId);
  const lastDocId = useUI((s) => s.currentDocId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  const fallbackDocId = useMemo(() => {
    if (lastDocId && docs.some((d) => d.id === lastDocId)) return lastDocId;
    return docs[0]?.id ?? null;
  }, [docs, lastDocId]);

  if (!spaceId) return <Navigate to="/" replace />;

  return (
    <div className="flex h-full w-full">
      <div className="hidden md:contents">
        {focus ? (
          <FocusRail activeSpaceId={spaceId} />
        ) : (
          <>
            <SpaceRail activeSpaceId={spaceId} />
            <Sidebar spaceId={spaceId} activeDocId={null} />
          </>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          spaceId={spaceId}
          docId={null}
          docName={`Brain space · ${notes.length} unsorted`}
          spaceName={space?.name}
          mode="dump"
          fallbackDocId={fallbackDocId}
        />
        <DumpMobileNotice spaceId={spaceId} />
        <main className="hidden flex-1 overflow-hidden md:block">
          <DumpCanvas spaceId={spaceId} />
        </main>
      </div>
    </div>
  );
}

function DumpMobileNotice({ spaceId }: { spaceId: string }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-paper px-6 py-10 md:hidden">
      <div className="max-w-sm text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          Brain space
        </div>
        <p className="mt-3 font-serif text-[18px] italic text-ink-2">
          Brain space works best on a larger screen.
        </p>
        <p className="mt-2 font-serif text-base text-ink-3">
          The canvas needs a mouse or trackpad.
        </p>
        <Link
          to={`/s/${spaceId}`}
          className="mt-6 inline-block font-mono text-[11px] uppercase tracking-wider text-ink underline underline-offset-4 hover:text-ink-2"
        >
          Open in Write →
        </Link>
      </div>
    </div>
  );
}

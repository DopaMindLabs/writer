import {
  Link,
  Navigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useEffect, useMemo, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { WriteSurface } from '@/components/surfaces/WriteSurface';
import { BrainSpaceCanvas } from '@/components/surfaces/BrainSpaceCanvas';
import { useSpace } from '@/hooks/useSpaces';
import { useDocuments, useDocument } from '@/hooks/useDocuments';
import { useUI } from '@/store/ui';

const BRAIN_SPACE_PANE = 'dump';

export function SplitScreen() {
  const { t } = useTranslation('screens');
  const { spaceId, docId } = useParams<{ spaceId: string; docId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const focus = searchParams.get('focus') === '1';
  const withParam = searchParams.get('with');

  const space = useSpace(spaceId);
  const docs = useDocuments(spaceId);
  const leftDoc = useDocument(docId);
  const rightIsBrainSpace = withParam === BRAIN_SPACE_PANE;
  const rightDoc = useDocument(rightIsBrainSpace ? null : withParam);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);
  const setCurrentDocId = useUI((s) => s.setCurrentDocId);

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  useEffect(() => {
    if (docId) setCurrentDocId(docId);
  }, [docId, setCurrentDocId]);

  const candidates = useMemo(
    () => docs.filter((d) => d.id !== docId),
    [docs, docId],
  );

  useEffect(() => {
    if (!docId || candidates.length === 0) return;
    if (withParam === BRAIN_SPACE_PANE) return;
    if (withParam && candidates.some((d) => d.id === withParam)) return;
    const fallback = candidates[0];
    if (!fallback) return;
    const next = new URLSearchParams(searchParams);
    next.set('with', fallback.id);
    setSearchParams(next, { replace: true });
  }, [docId, candidates, withParam, searchParams, setSearchParams]);

  if (!spaceId || !docId) return <Navigate to="/" replace />;

  function onPickRight(e: ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(searchParams);
    next.set('with', e.target.value);
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="flex h-full w-full">
      <div className="hidden md:contents">
        {focus ? (
          <FocusRail activeSpaceId={spaceId} />
        ) : (
          <>
            <SpaceRail activeSpaceId={spaceId} />
            <Sidebar spaceId={spaceId} activeDocId={docId} />
          </>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          spaceId={spaceId}
          docId={docId}
          docName={leftDoc?.name}
          spaceName={space?.name}
          mode="split"
        />
        <SplitMobileNotice spaceId={spaceId} docId={docId} />
        <main className="hidden flex-1 grid-cols-2 divide-x divide-rule overflow-hidden md:grid">
          <section className="flex min-w-0 flex-col">
            <div className="flex items-center justify-between border-b border-rule px-6 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
              <span>LEFT — {leftDoc?.name ?? '…'}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              {leftDoc && <WriteSurface doc={leftDoc} mode="write" />}
            </div>
          </section>
          <section className="flex min-w-0 flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-rule px-6 py-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                RIGHT —
              </span>
              <select
                value={withParam ?? ''}
                onChange={onPickRight}
                className="flex-1 truncate border-0 bg-transparent font-mono text-[10px] uppercase tracking-wider text-ink outline-none focus:underline"
                aria-label="Right pane document"
              >
                {candidates.length === 0 && (
                  <option value="">(no other docs)</option>
                )}
                {candidates.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
                <option value={BRAIN_SPACE_PANE}>Brain space</option>
              </select>
            </div>
            <div className="flex-1 overflow-hidden">
              {rightIsBrainSpace ? (
                <BrainSpaceCanvas spaceId={spaceId} />
              ) : rightDoc ? (
                <WriteSurface doc={rightDoc} mode="write" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-ink-3">
                  Pick a document from the dropdown above.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SplitMobileNotice({
  spaceId,
  docId,
}: {
  spaceId: string;
  docId: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-paper px-6 py-10 md:hidden">
      <div className="max-w-sm text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          Split view
        </div>
        <p className="mt-3 font-serif text-[18px] italic text-ink-2">
          Split view needs a larger screen.
        </p>
        <p className="mt-2 font-serif text-base text-ink-3">
          Open this document in Write mode instead.
        </p>
        <Link
          to={`/s/${spaceId}/d/${docId}`}
          className="mt-6 inline-block font-mono text-[11px] uppercase tracking-wider text-ink underline underline-offset-4 hover:text-ink-2"
        >
          Open in Write →
        </Link>
      </div>
    </div>
  );
}

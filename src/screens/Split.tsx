import {
  Link,
  Navigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { WriteSurface } from '@/components/surfaces/WriteSurface';
import { BrainSpaceCanvas } from '@/components/surfaces/BrainSpaceCanvas';
import { CitationsPane } from '@/components/surfaces/CitationsPane';
import { CitationsSidePanel } from '@/components/surfaces/CitationsSidePanel';
import { useSpace } from '@/hooks/useSpaces';
import { useDocuments, useDocument } from '@/hooks/useDocuments';
import { useUI } from '@/store/ui';

const BRAIN_SPACE_PANE = 'dump';
const CITATIONS_PANE = 'citations';
const SPECIAL_PANES = new Set<string>([BRAIN_SPACE_PANE, CITATIONS_PANE]);

const MIN_PCT = 25;
const MAX_PCT = 75;
const SNAP_PCT = 50;
const SNAP_TOLERANCE = 5;

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
  const rightIsCitations = withParam === CITATIONS_PANE;
  const rightIsSpecial = rightIsBrainSpace || rightIsCitations;
  const rightDoc = useDocument(rightIsSpecial ? null : withParam);
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
    if (withParam && SPECIAL_PANES.has(withParam)) return;
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
        <SplitPanes
          spaceId={spaceId}
          leftHeader={
            <span>{t('split.leftPrefix')} {leftDoc?.name ?? '…'}</span>
          }
          leftContent={leftDoc ? <WriteSurface doc={leftDoc} mode="write" /> : null}
          rightHeader={
            <>
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
                <option value={CITATIONS_PANE}>Citations</option>
              </select>
            </>
          }
          rightContent={
            rightIsBrainSpace ? (
              <BrainSpaceCanvas spaceId={spaceId} />
            ) : rightIsCitations ? (
              <CitationsPane
                spaceId={spaceId}
                spaceName={space?.name}
                density="compact"
              />
            ) : rightDoc ? (
              <WriteSurface doc={rightDoc} mode="write" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-3">
                Pick a document from the dropdown above.
              </div>
            )
          }
          aside={<CitationsSidePanel spaceId={spaceId} />}
        />
      </div>
    </div>
  );
}

interface SplitPanesProps {
  spaceId: string;
  leftHeader: React.ReactNode;
  leftContent: React.ReactNode;
  rightHeader: React.ReactNode;
  rightContent: React.ReactNode;
  aside?: React.ReactNode;
}

function SplitPanes({
  leftHeader,
  leftContent,
  rightHeader,
  rightContent,
  aside,
}: SplitPanesProps) {
  const storedPct = useUI((s) => s.splitDividerPct);
  const setStoredPct = useUI((s) => s.setSplitDividerPct);
  const [pct, setPct] = useState<number>(storedPct);
  const containerRef = useRef<HTMLElement | null>(null);
  const draggingRef = useRef(false);
  const prevCursorRef = useRef<string>('');
  const prevUserSelectRef = useRef<string>('');

  // Sync local state when external store changes (e.g., other tabs).
  useEffect(() => {
    if (!draggingRef.current) setPct(storedPct);
  }, [storedPct]);

  const commitPct = useCallback(
    (next: number) => {
      const clamped = Math.min(MAX_PCT, Math.max(MIN_PCT, next));
      setPct(clamped);
      setStoredPct(clamped);
    },
    [setStoredPct],
  );

  const releasePointer = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = prevCursorRef.current;
    document.body.style.userSelect = prevUserSelectRef.current;
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      draggingRef.current = true;
      prevCursorRef.current = document.body.style.cursor;
      prevUserSelectRef.current = document.body.style.userSelect;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0) return;
      const next = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(MAX_PCT, Math.max(MIN_PCT, next));
      setPct(clamped);
    },
    [],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const target = e.currentTarget;
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
      const settled =
        Math.abs(pct - SNAP_PCT) <= SNAP_TOLERANCE ? SNAP_PCT : pct;
      commitPct(settled);
      releasePointer();
    },
    [pct, commitPct, releasePointer],
  );

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const target = e.currentTarget;
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
      commitPct(pct);
      releasePointer();
    },
    [pct, commitPct, releasePointer],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 10 : 2;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          commitPct(pct - step);
          return;
        case 'ArrowRight':
          e.preventDefault();
          commitPct(pct + step);
          return;
        case 'Home':
          e.preventDefault();
          commitPct(MIN_PCT);
          return;
        case 'End':
          e.preventDefault();
          commitPct(MAX_PCT);
          return;
        case 'Enter':
        case ' ':
          e.preventDefault();
          commitPct(SNAP_PCT);
          return;
      }
    },
    [pct, commitPct],
  );

  return (
    <main
      ref={(el) => {
        containerRef.current = el;
      }}
      className="hidden flex-1 overflow-hidden md:flex"
    >
      <section
        className="flex min-w-0 flex-col"
        style={{ flexBasis: `${pct}%` }}
      >
        <div className="flex items-center justify-between border-b border-rule px-6 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          {leftHeader}
        </div>
        <div className="flex-1 overflow-hidden">{leftContent}</div>
      </section>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuemin={MIN_PCT}
        aria-valuemax={MAX_PCT}
        aria-valuenow={Math.round(pct)}
        aria-label="Resize split panes"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
        onDoubleClick={() => commitPct(SNAP_PCT)}
        className="group relative flex w-1 shrink-0 cursor-col-resize touch-none items-stretch bg-rule outline-none hover:bg-ink/30 focus-visible:bg-ink/40"
      >
        <span className="absolute inset-y-0 -left-1.5 w-4" aria-hidden />
      </div>
      <section
        className="flex min-w-0 flex-col"
        style={{ flexBasis: `${100 - pct}%` }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-rule px-6 py-1.5">
          {rightHeader}
        </div>
        <div className="flex-1 overflow-hidden">{rightContent}</div>
      </section>
      {aside}
    </main>
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

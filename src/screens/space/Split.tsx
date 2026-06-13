import {
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
import { LightboxContainerContext } from '@/components/ui/LightboxContainerContext';
import { SpaceRail } from '@/components/chrome/SpaceRail';
import { Sidebar } from '@/components/chrome/Sidebar';
import { FocusRail } from '@/components/chrome/FocusRail';
import { Topbar } from '@/components/chrome/Topbar';
import { MobileTabs } from '@/components/chrome/MobileTabs';
import { MobileMoreSheet } from '@/components/chrome/MobileMoreSheet';
import { WriteSurface } from '@/components/surfaces/WriteSurface';
import { BrainSpaceCanvas } from '@/components/surfaces/BrainSpaceCanvas';
import { CitationsPane } from '@/components/surfaces/CitationsPane';
import { CitationsSidePanel } from '@/components/surfaces/CitationsSidePanel';
import { useSpace } from '@/hooks/useSpaces';
import { useDocuments, useDocument } from '@/hooks/useDocuments';
import type { Doc } from '@/db/schema';
import { useUI } from '@/store/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { isLockedStatus } from '@/lib/docInspector/status';
import { routes } from '@/lib/routes';
import { Select, type SelectOption } from '@/components/ui/Select';

const BRAIN_SPACE_PANE = 'dump';
const CITATIONS_PANE = 'citations';
const SPECIAL_PANES = new Set<string>([BRAIN_SPACE_PANE, CITATIONS_PANE]);

const MIN_PCT = 25;
const MAX_PCT = 75;
const SNAP_PCT = 50;
const SNAP_TOLERANCE = 5;

/** Below the md breakpoint in portrait, the panes stack top/bottom. */
const STACKED_QUERY = '(max-width: 767px) and (orientation: portrait)';

export const SplitScreen = () => {
  const { spaceId, docId } = useParams<{ spaceId: string; docId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const focus = searchParams.get('focus') === '1';
  const withParam = searchParams.get('with');

  const docs = useDocuments(spaceId);
  const setCurrentSpaceId = useUI((s) => s.setCurrentSpaceId);
  const setCurrentDocId = useUI((s) => s.setCurrentDocId);

  useEffect(() => {
    if (spaceId) setCurrentSpaceId(spaceId);
  }, [spaceId, setCurrentSpaceId]);

  useEffect(() => {
    if (docId) setCurrentDocId(docId);
  }, [docId, setCurrentDocId]);

  const candidates = useMemo(
    () => (docs ?? []).filter((d) => d.id !== docId),
    [docs, docId],
  );

  useEffect(() => {
    if (!docId) return;
    const setDefault = () => {
      const next = new URLSearchParams(searchParams);
      next.set('with', BRAIN_SPACE_PANE);
      setSearchParams(next, { replace: true });
    };
    if (!withParam) {
      setDefault();
      return;
    }
    if (SPECIAL_PANES.has(withParam)) return;
    if (candidates.length === 0) return;
    if (candidates.some((d) => d.id === withParam)) return;
    setDefault();
  }, [docId, candidates, withParam, searchParams, setSearchParams]);

  if (!spaceId || !docId) return <Navigate to={routes.home()} replace />;

  return (
    <div className="flex h-full w-full">
      <SplitRails spaceId={spaceId} docId={docId} focus={focus} />
      <SplitMain
        spaceId={spaceId}
        docId={docId}
        withParam={withParam}
        candidates={candidates}
      />
    </div>
  );
};

const SplitMain = ({
  spaceId,
  docId,
  withParam,
  candidates,
}: {
  spaceId: string;
  docId: string;
  withParam: string | null;
  candidates: Doc[];
}) => {
  const { t } = useTranslation('screens');
  const [searchParams, setSearchParams] = useSearchParams();
  const space = useSpace(spaceId);
  const leftDoc = useDocument(docId);
  const rightIsBrainSpace = withParam === BRAIN_SPACE_PANE;
  const rightIsCitations = withParam === CITATIONS_PANE;
  const rightIsSpecial = rightIsBrainSpace || rightIsCitations;
  const rightDoc = useDocument(rightIsSpecial ? null : withParam);

  const onPickRight = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(searchParams);
    next.set('with', e.target.value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <Topbar
        spaceId={spaceId}
        docId={docId}
        docName={leftDoc?.name}
        spaceName={space?.name}
        mode="split"
      />
      <SplitPanes
        spaceId={spaceId}
        leftHeader={<span>{t('split.leftPrefix')} {leftDoc?.name ?? '…'}</span>}
        leftContent={<SplitLeftPane leftDoc={leftDoc} />}
        rightHeader={
          <SplitRightHeader
            candidates={candidates}
            withParam={withParam}
            onPickRight={onPickRight}
          />
        }
        rightContent={
          <SplitRightContent
            spaceId={spaceId}
            spaceName={space?.name}
            rightIsBrainSpace={rightIsBrainSpace}
            rightIsCitations={rightIsCitations}
            rightDoc={rightDoc}
          />
        }
        aside={<CitationsSidePanel spaceId={spaceId} />}
      />
      <SplitMobileChrome spaceId={spaceId} docId={docId} />
    </div>
  );
};

const SplitLeftPane = ({ leftDoc }: { leftDoc: Doc | undefined }) =>
  leftDoc ? (
    <WriteSurface
      doc={leftDoc}
      mode="write"
      locked={isLockedStatus(leftDoc.meta.status)}
    />
  ) : null;

const SplitMobileChrome = ({
  spaceId,
  docId,
}: {
  spaceId: string;
  docId: string;
}) => (
  <>
    <MobileTabs spaceId={spaceId} docId={docId} />
    <MobileMoreSheet spaceId={spaceId} docId={docId} />
  </>
);

const SplitRails = ({
  spaceId,
  docId,
  focus,
}: {
  spaceId: string;
  docId: string;
  focus: boolean;
}) => (
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
);

const SplitRightHeader = ({
  candidates,
  withParam,
  onPickRight,
}: {
  candidates: Doc[];
  withParam: string | null;
  onPickRight: (e: ChangeEvent<HTMLSelectElement>) => void;
}) => (
  <>
    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
      RIGHT —
    </span>
    <Select
      data-testid="split-right-pane-select"
      variant="bare"
      value={withParam ?? ''}
      onChange={onPickRight}
      aria-label="Right pane document"
      className="flex-1 truncate font-mono text-[10px] uppercase tracking-wider focus-within:underline"
      options={[
        ...(candidates.length === 0
          ? [{ value: '', label: '(no other docs)' }]
          : []),
        ...candidates.map<SelectOption>((d) => ({
          value: d.id,
          label: d.name,
        })),
        { value: BRAIN_SPACE_PANE, label: 'Brain space' },
        { value: CITATIONS_PANE, label: 'Citations' },
      ]}
    />
  </>
);

const SplitRightContent = ({
  spaceId,
  spaceName,
  rightIsBrainSpace,
  rightIsCitations,
  rightDoc,
}: {
  spaceId: string;
  spaceName: string | undefined;
  rightIsBrainSpace: boolean;
  rightIsCitations: boolean;
  rightDoc: Doc | undefined;
}) => {
  if (rightIsBrainSpace) return <BrainSpaceCanvas spaceId={spaceId} />;
  if (rightIsCitations) {
    return (
      <CitationsPane spaceId={spaceId} spaceName={spaceName} density="compact" />
    );
  }
  if (rightDoc)
    return (
      <WriteSurface
        doc={rightDoc}
        mode="write"
        locked={isLockedStatus(rightDoc.meta.status)}
      />
    );
  return (
    <div className="flex h-full items-center justify-center text-sm text-ink-3">
      Pick a document from the dropdown above.
    </div>
  );
};

interface SplitPanesProps {
  spaceId: string;
  leftHeader: React.ReactNode;
  leftContent: React.ReactNode;
  rightHeader: React.ReactNode;
  rightContent: React.ReactNode;
  aside?: React.ReactNode;
}

interface DividerControls {
  pct: number;
  stacked: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  commitPct: (next: number) => void;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
}

const clampPct = (n: number): number =>
  Math.min(MAX_PCT, Math.max(MIN_PCT, n));

const releaseCapture = (
  e: ReactPointerEvent<HTMLDivElement>,
): void => {
  const target = e.currentTarget;
  if (target.hasPointerCapture(e.pointerId)) {
    target.releasePointerCapture(e.pointerId);
  }
};

interface DragState {
  pct: number;
  stacked: boolean;
  setPct: (n: number) => void;
  containerRef: React.RefObject<HTMLElement | null>;
  draggingRef: React.RefObject<boolean>;
  prevCursorRef: React.RefObject<string>;
  prevUserSelectRef: React.RefObject<string>;
  commitPct: (next: number) => void;
}

interface PointerHandlers {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => void;
}

const usePointerHandlers = (state: DragState): PointerHandlers => {
  const { pct, stacked, setPct, containerRef, draggingRef } = state;
  const { prevCursorRef, prevUserSelectRef, commitPct } = state;

  const releasePointer = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = prevCursorRef.current;
    document.body.style.userSelect = prevUserSelectRef.current;
  }, [draggingRef, prevCursorRef, prevUserSelectRef]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      draggingRef.current = true;
      prevCursorRef.current = document.body.style.cursor;
      prevUserSelectRef.current = document.body.style.userSelect;
      document.body.style.cursor = stacked ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [draggingRef, prevCursorRef, prevUserSelectRef, stacked],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const extent = stacked ? rect.height : rect.width;
      if (extent === 0) return;
      const offset = stacked ? e.clientY - rect.top : e.clientX - rect.left;
      setPct(clampPct((offset / extent) * 100));
    },
    [draggingRef, containerRef, setPct, stacked],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      releaseCapture(e);
      const settled =
        Math.abs(pct - SNAP_PCT) <= SNAP_TOLERANCE ? SNAP_PCT : pct;
      commitPct(settled);
      releasePointer();
    },
    [pct, commitPct, releasePointer, draggingRef],
  );

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      releaseCapture(e);
      commitPct(pct);
      releasePointer();
    },
    [pct, commitPct, releasePointer, draggingRef],
  );

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
};

const useKeyboardHandler = (
  pct: number,
  commitPct: (next: number) => void,
): ((e: KeyboardEvent<HTMLDivElement>) => void) =>
  useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 10 : 2;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          commitPct(pct - step);
          return;
        case 'ArrowRight':
        case 'ArrowDown':
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

const useDividerControls = (): DividerControls => {
  const stacked = useMediaQuery(STACKED_QUERY);
  const storedPct = useUI((s) => s.splitDividerPct);
  const setStoredPct = useUI((s) => s.setSplitDividerPct);
  const [pct, setPct] = useState<number>(storedPct);
  const containerRef = useRef<HTMLElement | null>(null);
  const draggingRef = useRef(false);
  const prevCursorRef = useRef<string>('');
  const prevUserSelectRef = useRef<string>('');

  // Sync local state when external store changes (e.g., other tabs). The
  // stacked (portrait phone) layout always starts at an even split rather
  // than inheriting a divider position dragged on a wide screen.
  useEffect(() => {
    if (draggingRef.current) return;
    setPct(stacked ? SNAP_PCT : storedPct);
  }, [storedPct, stacked]);

  const commitPct = useCallback(
    (next: number) => {
      const clamped = clampPct(next);
      setPct(clamped);
      // Stacked drags stay session-local so they don't clobber the persisted
      // side-by-side position.
      if (!stacked) setStoredPct(clamped);
    },
    [setStoredPct, stacked],
  );

  const pointer = usePointerHandlers({
    pct,
    stacked,
    setPct,
    containerRef,
    draggingRef,
    prevCursorRef,
    prevUserSelectRef,
    commitPct,
  });
  const onKeyDown = useKeyboardHandler(pct, commitPct);

  return { pct, stacked, containerRef, commitPct, onKeyDown, ...pointer };
};

const DividerHandle = ({ controls }: { controls: DividerControls }) => {
  const { pct, stacked, commitPct } = controls;
  return (
    <div
      data-testid="split-divider"
      role="separator"
      aria-orientation={stacked ? 'horizontal' : 'vertical'}
      aria-valuemin={MIN_PCT}
      aria-valuemax={MAX_PCT}
      aria-valuenow={Math.round(pct)}
      aria-label="Resize split panes"
      tabIndex={0}
      onPointerDown={controls.onPointerDown}
      onPointerMove={controls.onPointerMove}
      onPointerUp={controls.onPointerUp}
      onPointerCancel={controls.onPointerCancel}
      onKeyDown={controls.onKeyDown}
      onDoubleClick={() => { commitPct(SNAP_PCT); }}
      className={cn(
        'group relative flex shrink-0 touch-none items-stretch bg-rule outline-none hover:bg-ink/30 focus-visible:bg-ink/40',
        stacked ? 'h-1 cursor-row-resize' : 'w-1 cursor-col-resize',
      )}
    >
      <span
        className={cn(
          'absolute',
          stacked ? 'inset-x-0 -top-1.5 h-4' : 'inset-y-0 -left-1.5 w-4',
        )}
        aria-hidden
      />
    </div>
  );
};

const SplitPanes = ({
  leftHeader,
  leftContent,
  rightHeader,
  rightContent,
  aside,
}: SplitPanesProps) => {
  const controls = useDividerControls();
  const { pct, stacked, containerRef } = controls;
  const [rightPaneEl, setRightPaneEl] = useState<HTMLElement | null>(null);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      ref={(el) => {
        containerRef.current = el;
      }}
      className={cn('flex flex-1 overflow-hidden', stacked && 'flex-col')}
    >
      <section
        className="flex min-w-0 flex-col"
        style={{ flexBasis: `${String(pct)}%` }}
      >
        <div className="flex items-center justify-between border-b border-rule px-6 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          {leftHeader}
        </div>
        <div className="flex-1 overflow-hidden">{leftContent}</div>
      </section>
      <DividerHandle controls={controls} />
      <section
        className="flex min-w-0 flex-col"
        style={{ flexBasis: `${String(100 - pct)}%` }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-rule px-6 py-1.5">
          {rightHeader}
        </div>
        <LightboxContainerContext.Provider value={rightPaneEl}>
          <div
            ref={setRightPaneEl}
            data-testid="split-right-pane"
            className="relative flex-1 overflow-hidden"
          >
            {rightContent}
          </div>
        </LightboxContainerContext.Provider>
      </section>
      {aside}
    </main>
  );
};


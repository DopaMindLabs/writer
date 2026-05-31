import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'hc-light' | 'hc-dark';
export type InspectorMode = 'none' | 'icons' | 'expanded';
export type InspectorSection = 'outline' | 'info' | 'history' | 'actions';
export type ReadingWidth = 's' | 'm' | 'l';
export type DiffMode = 'inline' | 'side-by-side';

interface UIState {
  currentSpaceId: string | null;
  currentDocId: string | null;
  theme: Theme;
  exportOpen: boolean;
  mobileNavOpen: boolean;
  mobileMoreOpen: boolean;
  detailNoteId: string | null;
  focusedNoteId: string | null;
  floatingToolbarEnabled: boolean;
  citationsDrawerOpen: boolean;
  splitDividerPct: number;
  inspectorMode: InspectorMode;
  inspectorSection: InspectorSection;
  readingWidth: ReadingWidth;
  versionModalOpen: boolean;
  diffMode: DiffMode;
  compareRevisionIds: { base: string | null; compare: string | null };
  setCurrentSpaceId: (id: string | null) => void;
  setCurrentDocId: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  setExportOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setMobileMoreOpen: (open: boolean) => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  focusNote: (id: string | null) => void;
  setFloatingToolbarEnabled: (enabled: boolean) => void;
  openCitationsDrawer: () => void;
  closeCitationsDrawer: () => void;
  setSplitDividerPct: (pct: number) => void;
  setInspectorMode: (mode: InspectorMode) => void;
  toggleInspector: () => void;
  setInspectorSection: (section: InspectorSection) => void;
  setReadingWidth: (width: ReadingWidth) => void;
  setVersionModalOpen: (open: boolean) => void;
  setDiffMode: (mode: DiffMode) => void;
  setCompareRevisionIds: (ids: {
    base: string | null;
    compare: string | null;
  }) => void;
}

const PERSIST_KEY = 'lorem-ui';

const loadPersisted = (): Partial<UIState> => {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<UIState>;
    return parsed;
  } catch {
    return {};
  }
};

type PersistedShape = Pick<
  UIState,
  | 'theme'
  | 'currentSpaceId'
  | 'floatingToolbarEnabled'
  | 'splitDividerPct'
  | 'inspectorMode'
  | 'inspectorSection'
  | 'readingWidth'
  | 'diffMode'
>;

const READING_WIDTHS: ReadingWidth[] = ['s', 'm', 'l'];
const INSPECTOR_MODES: InspectorMode[] = ['none', 'icons', 'expanded'];
const INSPECTOR_SECTIONS: InspectorSection[] = [
  'outline',
  'info',
  'history',
  'actions',
];

const sanitizeInspectorMode = (v: unknown): InspectorMode =>
  typeof v === 'string' && (INSPECTOR_MODES as string[]).includes(v)
    ? (v as InspectorMode)
    : 'none';

const sanitizeInspectorSection = (v: unknown): InspectorSection =>
  typeof v === 'string' && (INSPECTOR_SECTIONS as string[]).includes(v)
    ? (v as InspectorSection)
    : 'outline';

const sanitizeReadingWidth = (v: unknown): ReadingWidth =>
  typeof v === 'string' && (READING_WIDTHS as string[]).includes(v)
    ? (v as ReadingWidth)
    : 'm';

const DIFF_MODES: DiffMode[] = ['inline', 'side-by-side'];

const sanitizeDiffMode = (v: unknown): DiffMode =>
  typeof v === 'string' && (DIFF_MODES as string[]).includes(v)
    ? (v as DiffMode)
    : 'side-by-side';

const DEFAULT_SPLIT_DIVIDER_PCT = 50;
const MIN_SPLIT_DIVIDER_PCT = 25;
const MAX_SPLIT_DIVIDER_PCT = 75;

const clampDividerPct = (pct: number): number => {
  if (!Number.isFinite(pct)) return DEFAULT_SPLIT_DIVIDER_PCT;
  return Math.min(MAX_SPLIT_DIVIDER_PCT, Math.max(MIN_SPLIT_DIVIDER_PCT, pct));
};

const persist = (state: PersistedShape): void => {
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
};

const persisted = loadPersisted();

const buildSnapshot = (
  s: UIState,
  overrides: Partial<PersistedShape> = {},
): PersistedShape => ({
  theme: s.theme,
  currentSpaceId: s.currentSpaceId,
  floatingToolbarEnabled: s.floatingToolbarEnabled,
  splitDividerPct: s.splitDividerPct,
  inspectorMode: s.inspectorMode,
  inspectorSection: s.inspectorSection,
  readingWidth: s.readingWidth,
  diffMode: s.diffMode,
  ...overrides,
});

type SetState = (partial: Partial<UIState>) => void;
type GetState = () => UIState;
type Snapshot = (overrides?: Partial<PersistedShape>) => PersistedShape;

const initialState = () => ({
  currentSpaceId: persisted.currentSpaceId ?? null,
  currentDocId: null,
  theme: persisted.theme ?? 'light',
  exportOpen: false,
  mobileNavOpen: false,
  mobileMoreOpen: false,
  detailNoteId: null,
  focusedNoteId: null,
  floatingToolbarEnabled: persisted.floatingToolbarEnabled ?? false,
  citationsDrawerOpen: false,
  splitDividerPct: clampDividerPct(
    persisted.splitDividerPct ?? DEFAULT_SPLIT_DIVIDER_PCT,
  ),
  inspectorMode: sanitizeInspectorMode(persisted.inspectorMode),
  inspectorSection: sanitizeInspectorSection(persisted.inspectorSection),
  readingWidth: sanitizeReadingWidth(persisted.readingWidth),
  versionModalOpen: false,
  diffMode: sanitizeDiffMode(persisted.diffMode),
  compareRevisionIds: { base: null, compare: null },
});

const createActions = (
  set: SetState,
  get: GetState,
  snapshot: Snapshot,
) => ({
  ...createDocActions(set, snapshot),
  ...createToggleActions(set),
  ...createInspectorActions(set, get, snapshot),
});

const createDocActions = (set: SetState, snapshot: Snapshot) => ({
  setCurrentSpaceId: (id: string | null) => {
    set({ currentSpaceId: id });
    persist(snapshot({ currentSpaceId: id }));
  },
  setCurrentDocId: (id: string | null) => { set({ currentDocId: id }); },
  setTheme: (theme: Theme) => {
    set({ theme });
    persist(snapshot({ theme }));
  },
  setFloatingToolbarEnabled: (floatingToolbarEnabled: boolean) => {
    set({ floatingToolbarEnabled });
    persist(snapshot({ floatingToolbarEnabled }));
  },
  setSplitDividerPct: (pct: number) => {
    const clamped = clampDividerPct(pct);
    set({ splitDividerPct: clamped });
    persist(snapshot({ splitDividerPct: clamped }));
  },
});

const createToggleActions = (set: SetState) => ({
  setExportOpen: (exportOpen: boolean) => { set({ exportOpen }); },
  setMobileNavOpen: (mobileNavOpen: boolean) => { set({ mobileNavOpen }); },
  setMobileMoreOpen: (mobileMoreOpen: boolean) => { set({ mobileMoreOpen }); },
  openDetail: (id: string) => { set({ detailNoteId: id, focusedNoteId: id }); },
  closeDetail: () => { set({ detailNoteId: null }); },
  focusNote: (id: string | null) => { set({ focusedNoteId: id }); },
  openCitationsDrawer: () => { set({ citationsDrawerOpen: true }); },
  closeCitationsDrawer: () => { set({ citationsDrawerOpen: false }); },
  setVersionModalOpen: (versionModalOpen: boolean) => {
    set({ versionModalOpen });
  },
  setCompareRevisionIds: (compareRevisionIds: {
    base: string | null;
    compare: string | null;
  }) => { set({ compareRevisionIds }); },
});

const createInspectorActions = (
  set: SetState,
  get: GetState,
  snapshot: Snapshot,
) => ({
  setInspectorMode: (inspectorMode: InspectorMode) => {
    set({ inspectorMode });
    persist(snapshot({ inspectorMode }));
  },
  toggleInspector: () => {
    const current = get().inspectorMode;
    const next: InspectorMode =
      current === 'none' ? 'icons' : current === 'icons' ? 'expanded' : 'none';
    set({ inspectorMode: next });
    persist(snapshot({ inspectorMode: next }));
  },
  setInspectorSection: (inspectorSection: InspectorSection) => {
    set({ inspectorSection });
    persist(snapshot({ inspectorSection }));
  },
  setReadingWidth: (readingWidth: ReadingWidth) => {
    set({ readingWidth });
    persist(snapshot({ readingWidth }));
  },
  setDiffMode: (diffMode: DiffMode) => {
    set({ diffMode });
    persist(snapshot({ diffMode }));
  },
});

export const useUI = create<UIState>((set, get) => {
  const snapshot = (overrides: Partial<PersistedShape> = {}): PersistedShape =>
    buildSnapshot(get(), overrides);
  return {
    ...initialState(),
    ...createActions(set, get, snapshot),
  };
});

import { create } from 'zustand';
import { HL_COLORS, type HighlightColor } from '@/theme/tokens';

export type Theme = 'light' | 'dark' | 'hc-light' | 'hc-dark';
export type InspectorMode = 'none' | 'icons' | 'expanded';
export type InspectorSection = 'outline' | 'info' | 'history' | 'actions';
export type ReadingWidth = 's' | 'm' | 'l';
export type DiffMode = 'inline' | 'side-by-side';
export type PdfReaderPanel = 'highlights' | 'info' | null;

/** Per-document reader chrome memory: which side panel is open, whether the rail
 * and the thumbnail column are shown. Keyed by media id in {@link UIState}. */
export interface PdfReaderPref {
  railHidden: boolean;
  panel: PdfReaderPanel;
  thumbs: boolean;
}

interface UIState {
  currentSpaceId: string | null;
  currentDocId: string | null;
  theme: Theme;
  exportOpen: boolean;
  mobileNavOpen: boolean;
  mobileMoreOpen: boolean;
  mobileInspectorOpen: boolean;
  detailNoteId: string | null;
  focusedNoteId: string | null;
  floatingToolbarEnabled: boolean;
  citationsDrawerOpen: boolean;
  splitDividerPct: number;
  inspectorMode: InspectorMode;
  inspectorSection: InspectorSection;
  readingWidth: ReadingWidth;
  versionModalOpen: boolean;
  saveVersionOpen: boolean;
  diffMode: DiffMode;
  compareRevisionIds: { base: string | null; compare: string | null };
  pdfHighlightColor: HighlightColor;
  pdfReaderPrefs: Record<string, PdfReaderPref>;
  setCurrentSpaceId: (id: string | null) => void;
  setCurrentDocId: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  setExportOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setMobileMoreOpen: (open: boolean) => void;
  setMobileInspectorOpen: (open: boolean) => void;
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
  setSaveVersionOpen: (open: boolean) => void;
  setDiffMode: (mode: DiffMode) => void;
  setCompareRevisionIds: (ids: {
    base: string | null;
    compare: string | null;
  }) => void;
  setPdfHighlightColor: (color: HighlightColor) => void;
  setPdfReaderPref: (mediaId: string, patch: Partial<PdfReaderPref>) => void;
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
  | 'pdfHighlightColor'
  | 'pdfReaderPrefs'
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

const sanitizePdfHighlightColor = (v: unknown): HighlightColor =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(HL_COLORS, v)
    ? (v as HighlightColor)
    : 'yellow';

export const DEFAULT_PDF_READER_PREF: PdfReaderPref = {
  railHidden: false,
  panel: null,
  thumbs: false,
};

/** Newest inserts win once the record is full; oldest key (insertion order) is
 * evicted. A bound keeps the persisted blob small without any LRU machinery. */
const PDF_READER_PREFS_CAP = 50;

const isPdfReaderPref = (v: unknown): v is PdfReaderPref => {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  if (Object.keys(p).length !== 3) return false;
  return (
    typeof p.railHidden === 'boolean' &&
    typeof p.thumbs === 'boolean' &&
    (p.panel === 'highlights' || p.panel === 'info' || p.panel === null)
  );
};

const sanitizePdfReaderPrefs = (
  v: unknown,
): Record<string, PdfReaderPref> => {
  if (typeof v !== 'object' || v === null) return {};
  const out: Record<string, PdfReaderPref> = {};
  for (const [key, value] of Object.entries(v)) {
    if (isPdfReaderPref(value)) out[key] = value;
  }
  return out;
};

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
  pdfHighlightColor: s.pdfHighlightColor,
  pdfReaderPrefs: s.pdfReaderPrefs,
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
  mobileInspectorOpen: false,
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
  saveVersionOpen: false,
  diffMode: sanitizeDiffMode(persisted.diffMode),
  compareRevisionIds: { base: null, compare: null },
  pdfHighlightColor: sanitizePdfHighlightColor(persisted.pdfHighlightColor),
  pdfReaderPrefs: sanitizePdfReaderPrefs(persisted.pdfReaderPrefs),
});

const createActions = (
  set: SetState,
  get: GetState,
  snapshot: Snapshot,
) => ({
  ...createDocActions(set, snapshot),
  ...createToggleActions(set),
  ...createInspectorActions(set, get, snapshot),
  ...createPdfReaderActions(set, get, snapshot),
});

const createPdfReaderActions = (
  set: SetState,
  get: GetState,
  snapshot: Snapshot,
) => ({
  setPdfReaderPref: (mediaId: string, patch: Partial<PdfReaderPref>) => {
    const prev = get().pdfReaderPrefs;
    const current = prev[mediaId] ?? DEFAULT_PDF_READER_PREF;
    const merged: Record<string, PdfReaderPref> = {
      ...prev,
      [mediaId]: { ...current, ...patch },
    };
    // Keep the newest entries once the cap is passed; insertion order evicts the
    // oldest (a new key appends, an update keeps its place, so count is stable).
    const entries = Object.entries(merged);
    const next =
      entries.length > PDF_READER_PREFS_CAP
        ? Object.fromEntries(entries.slice(entries.length - PDF_READER_PREFS_CAP))
        : merged;
    set({ pdfReaderPrefs: next });
    persist(snapshot({ pdfReaderPrefs: next }));
  },
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
  setPdfHighlightColor: (pdfHighlightColor: HighlightColor) => {
    set({ pdfHighlightColor });
    persist(snapshot({ pdfHighlightColor }));
  },
});

const createToggleActions = (set: SetState) => ({
  setExportOpen: (exportOpen: boolean) => { set({ exportOpen }); },
  setMobileNavOpen: (mobileNavOpen: boolean) => { set({ mobileNavOpen }); },
  setMobileMoreOpen: (mobileMoreOpen: boolean) => { set({ mobileMoreOpen }); },
  setMobileInspectorOpen: (mobileInspectorOpen: boolean) => {
    set({ mobileInspectorOpen });
  },
  openDetail: (id: string) => { set({ detailNoteId: id, focusedNoteId: id }); },
  closeDetail: () => { set({ detailNoteId: null }); },
  focusNote: (id: string | null) => { set({ focusedNoteId: id }); },
  openCitationsDrawer: () => { set({ citationsDrawerOpen: true }); },
  closeCitationsDrawer: () => { set({ citationsDrawerOpen: false }); },
  setVersionModalOpen: (versionModalOpen: boolean) => {
    set({ versionModalOpen });
  },
  setSaveVersionOpen: (saveVersionOpen: boolean) => {
    set({ saveVersionOpen });
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

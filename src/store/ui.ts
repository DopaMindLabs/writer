import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'hc-light' | 'hc-dark';
export type InspectorMode = 'none' | 'icons' | 'expanded';
export type InspectorSection = 'outline' | 'info' | 'history' | 'actions';
export type ReadingWidth = 's' | 'm' | 'l';

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
}

const PERSIST_KEY = 'lorem-ui';

function loadPersisted(): Partial<UIState> {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<UIState>;
    return parsed;
  } catch {
    return {};
  }
}

type PersistedShape = Pick<
  UIState,
  | 'theme'
  | 'currentSpaceId'
  | 'floatingToolbarEnabled'
  | 'splitDividerPct'
  | 'inspectorMode'
  | 'inspectorSection'
  | 'readingWidth'
>;

const READING_WIDTHS: ReadingWidth[] = ['s', 'm', 'l'];
const INSPECTOR_MODES: InspectorMode[] = ['none', 'icons', 'expanded'];
const INSPECTOR_SECTIONS: InspectorSection[] = [
  'outline',
  'info',
  'history',
  'actions',
];

function sanitizeInspectorMode(v: unknown): InspectorMode {
  return typeof v === 'string' && (INSPECTOR_MODES as string[]).includes(v)
    ? (v as InspectorMode)
    : 'none';
}

function sanitizeInspectorSection(v: unknown): InspectorSection {
  return typeof v === 'string' && (INSPECTOR_SECTIONS as string[]).includes(v)
    ? (v as InspectorSection)
    : 'outline';
}

function sanitizeReadingWidth(v: unknown): ReadingWidth {
  return typeof v === 'string' && (READING_WIDTHS as string[]).includes(v)
    ? (v as ReadingWidth)
    : 'm';
}

const DEFAULT_SPLIT_DIVIDER_PCT = 50;
const MIN_SPLIT_DIVIDER_PCT = 25;
const MAX_SPLIT_DIVIDER_PCT = 75;

function clampDividerPct(pct: number): number {
  if (!Number.isFinite(pct)) return DEFAULT_SPLIT_DIVIDER_PCT;
  return Math.min(MAX_SPLIT_DIVIDER_PCT, Math.max(MIN_SPLIT_DIVIDER_PCT, pct));
}

function persist(state: PersistedShape) {
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

const persisted = loadPersisted();

export const useUI = create<UIState>((set, get) => {
  function snapshot(overrides: Partial<PersistedShape> = {}): PersistedShape {
    const s = get();
    return {
      theme: s.theme,
      currentSpaceId: s.currentSpaceId,
      floatingToolbarEnabled: s.floatingToolbarEnabled,
      splitDividerPct: s.splitDividerPct,
      inspectorMode: s.inspectorMode,
      inspectorSection: s.inspectorSection,
      readingWidth: s.readingWidth,
      ...overrides,
    };
  }

  return {
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
    setCurrentSpaceId: (id) => {
      set({ currentSpaceId: id });
      persist(snapshot({ currentSpaceId: id }));
    },
    setCurrentDocId: (id) => set({ currentDocId: id }),
    setTheme: (theme) => {
      set({ theme });
      persist(snapshot({ theme }));
    },
    setExportOpen: (exportOpen) => set({ exportOpen }),
    setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
    setMobileMoreOpen: (mobileMoreOpen) => set({ mobileMoreOpen }),
    openDetail: (id) => set({ detailNoteId: id, focusedNoteId: id }),
    closeDetail: () => set({ detailNoteId: null }),
    focusNote: (id) => set({ focusedNoteId: id }),
    setFloatingToolbarEnabled: (floatingToolbarEnabled) => {
      set({ floatingToolbarEnabled });
      persist(snapshot({ floatingToolbarEnabled }));
    },
    openCitationsDrawer: () => set({ citationsDrawerOpen: true }),
    closeCitationsDrawer: () => set({ citationsDrawerOpen: false }),
    setSplitDividerPct: (pct) => {
      const clamped = clampDividerPct(pct);
      set({ splitDividerPct: clamped });
      persist(snapshot({ splitDividerPct: clamped }));
    },
    setInspectorMode: (inspectorMode) => {
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
    setInspectorSection: (inspectorSection) => {
      set({ inspectorSection });
      persist(snapshot({ inspectorSection }));
    },
    setReadingWidth: (readingWidth) => {
      set({ readingWidth });
      persist(snapshot({ readingWidth }));
    },
  };
});

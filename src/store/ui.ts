import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'hc-light' | 'hc-dark';

interface UIState {
  currentSpaceId: string | null;
  currentDocId: string | null;
  theme: Theme;
  exportOpen: boolean;
  mobileNavOpen: boolean;
  detailNoteId: string | null;
  focusedNoteId: string | null;
  floatingToolbarEnabled: boolean;
  citationsDrawerOpen: boolean;
  splitDividerPct: number;
  setCurrentSpaceId: (id: string | null) => void;
  setCurrentDocId: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  setExportOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  focusNote: (id: string | null) => void;
  setFloatingToolbarEnabled: (enabled: boolean) => void;
  openCitationsDrawer: () => void;
  closeCitationsDrawer: () => void;
  setSplitDividerPct: (pct: number) => void;
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
  'theme' | 'currentSpaceId' | 'floatingToolbarEnabled' | 'splitDividerPct'
>;

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
      ...overrides,
    };
  }

  return {
    currentSpaceId: persisted.currentSpaceId ?? null,
    currentDocId: null,
    theme: persisted.theme ?? 'light',
    exportOpen: false,
    mobileNavOpen: false,
    detailNoteId: null,
    focusedNoteId: null,
    floatingToolbarEnabled: persisted.floatingToolbarEnabled ?? false,
    citationsDrawerOpen: false,
    splitDividerPct: clampDividerPct(
      persisted.splitDividerPct ?? DEFAULT_SPLIT_DIVIDER_PCT,
    ),
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
  };
});

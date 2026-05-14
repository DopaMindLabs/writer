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
  setCurrentSpaceId: (id: string | null) => void;
  setCurrentDocId: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  setExportOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  focusNote: (id: string | null) => void;
  setFloatingToolbarEnabled: (enabled: boolean) => void;
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
  'theme' | 'currentSpaceId' | 'floatingToolbarEnabled'
>;

function persist(state: PersistedShape) {
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

const persisted = loadPersisted();

export const useUI = create<UIState>((set, get) => ({
  currentSpaceId: persisted.currentSpaceId ?? null,
  currentDocId: null,
  theme: persisted.theme ?? 'light',
  exportOpen: false,
  mobileNavOpen: false,
  detailNoteId: null,
  focusedNoteId: null,
  floatingToolbarEnabled: persisted.floatingToolbarEnabled ?? false,
  setCurrentSpaceId: (id) => {
    set({ currentSpaceId: id });
    persist({
      theme: get().theme,
      currentSpaceId: id,
      floatingToolbarEnabled: get().floatingToolbarEnabled,
    });
  },
  setCurrentDocId: (id) => set({ currentDocId: id }),
  setTheme: (theme) => {
    set({ theme });
    persist({
      theme,
      currentSpaceId: get().currentSpaceId,
      floatingToolbarEnabled: get().floatingToolbarEnabled,
    });
  },
  setExportOpen: (exportOpen) => set({ exportOpen }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  openDetail: (id) => set({ detailNoteId: id, focusedNoteId: id }),
  closeDetail: () => set({ detailNoteId: null }),
  focusNote: (id) => set({ focusedNoteId: id }),
  setFloatingToolbarEnabled: (floatingToolbarEnabled) => {
    set({ floatingToolbarEnabled });
    persist({
      theme: get().theme,
      currentSpaceId: get().currentSpaceId,
      floatingToolbarEnabled,
    });
  },
}));

import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface UIState {
  currentSpaceId: string | null;
  currentDocId: string | null;
  theme: Theme;
  exportOpen: boolean;
  mobileNavOpen: boolean;
  setCurrentSpaceId: (id: string | null) => void;
  setCurrentDocId: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  setExportOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
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

function persist(state: Pick<UIState, 'theme' | 'currentSpaceId'>) {
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
  setCurrentSpaceId: (id) => {
    set({ currentSpaceId: id });
    persist({ theme: get().theme, currentSpaceId: id });
  },
  setCurrentDocId: (id) => set({ currentDocId: id }),
  setTheme: (theme) => {
    set({ theme });
    persist({ theme, currentSpaceId: get().currentSpaceId });
  },
  setExportOpen: (exportOpen) => set({ exportOpen }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));

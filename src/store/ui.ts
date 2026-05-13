import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface UIState {
  currentWorldId: string | null;
  currentDocId: string | null;
  theme: Theme;
  exportOpen: boolean;
  setCurrentWorldId: (id: string | null) => void;
  setCurrentDocId: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  setExportOpen: (open: boolean) => void;
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

function persist(state: Pick<UIState, 'theme' | 'currentWorldId'>) {
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

const persisted = loadPersisted();

export const useUI = create<UIState>((set, get) => ({
  currentWorldId: persisted.currentWorldId ?? null,
  currentDocId: null,
  theme: persisted.theme ?? 'light',
  exportOpen: false,
  setCurrentWorldId: (id) => {
    set({ currentWorldId: id });
    persist({ theme: get().theme, currentWorldId: id });
  },
  setCurrentDocId: (id) => set({ currentDocId: id }),
  setTheme: (theme) => {
    set({ theme });
    persist({ theme, currentWorldId: get().currentWorldId });
  },
  setExportOpen: (exportOpen) => set({ exportOpen }),
}));

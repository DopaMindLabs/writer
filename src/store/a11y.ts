import { create } from 'zustand';
import {
  type A11yPrefs,
  type FocusRing,
  type LineSpacing,
  type LinkUnderline,
  type MotionPref,
  type TextScale,
  DEFAULT_A11Y_PREFS,
  sanitizeA11yPrefs,
} from '@/theme/a11y-prefs';

interface A11yState extends A11yPrefs {
  setMotion: (value: MotionPref) => void;
  setTextScale: (value: TextScale) => void;
  setLineSpacing: (value: LineSpacing) => void;
  setLinkUnderline: (value: LinkUnderline) => void;
  setFocusRing: (value: FocusRing) => void;
  reset: () => void;
}

const PERSIST_KEY = 'lorem-a11y';

const loadPersisted = (): A11yPrefs => {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return DEFAULT_A11Y_PREFS;
    return sanitizeA11yPrefs(JSON.parse(raw));
  } catch {
    return DEFAULT_A11Y_PREFS;
  }
};

const persist = (prefs: A11yPrefs): void => {
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
};

type SetState = (partial: Partial<A11yState>) => void;
type GetState = () => A11yState;

const snapshot = (s: A11yState): A11yPrefs => ({
  motion: s.motion,
  textScale: s.textScale,
  lineSpacing: s.lineSpacing,
  linkUnderline: s.linkUnderline,
  focusRing: s.focusRing,
});

const createActions = (set: SetState, get: GetState) => ({
  setMotion: (motion: MotionPref) => {
    set({ motion });
    persist(snapshot(get()));
  },
  setTextScale: (textScale: TextScale) => {
    set({ textScale });
    persist(snapshot(get()));
  },
  setLineSpacing: (lineSpacing: LineSpacing) => {
    set({ lineSpacing });
    persist(snapshot(get()));
  },
  setLinkUnderline: (linkUnderline: LinkUnderline) => {
    set({ linkUnderline });
    persist(snapshot(get()));
  },
  setFocusRing: (focusRing: FocusRing) => {
    set({ focusRing });
    persist(snapshot(get()));
  },
  reset: () => {
    set({ ...DEFAULT_A11Y_PREFS });
    persist(DEFAULT_A11Y_PREFS);
  },
});

export const useA11y = create<A11yState>((set, get) => ({
  ...loadPersisted(),
  ...createActions(set, get),
}));

import { createContext, useContext } from 'react';
import type { Theme } from '@/store/ui';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'lorem-ui';

export const detectInitialTheme = (): Theme | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { theme?: unknown };
      if (typeof parsed.theme === 'string') return null;
    }
  } catch {
    /* fall through */
  }
  const wantsContrast = window.matchMedia('(prefers-contrast: more)').matches;
  if (!wantsContrast) return null;
  const wantsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return wantsDark ? 'hc-dark' : 'hc-light';
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
};

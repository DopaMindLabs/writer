import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useUI } from '@/store/ui';
import type { Theme } from '@/store/ui';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'lorem-ui';

function detectInitialTheme(): Theme | null {
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
  const wantsContrast = window.matchMedia?.('(prefers-contrast: more)').matches;
  if (!wantsContrast) return null;
  const wantsDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return wantsDark ? 'hc-dark' : 'hc-light';
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const theme = useUI((s) => s.theme);
  const setTheme = useUI((s) => s.setTheme);

  useEffect(() => {
    const detected = detectInitialTheme();
    if (detected) setTheme(detected);
    // intentional: only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

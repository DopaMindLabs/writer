import { useEffect, type ReactNode } from 'react';
import { useUI } from '@/store/ui';
import { ThemeContext, detectInitialTheme } from './theme-context';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const theme = useUI((s) => s.theme);
  const setTheme = useUI((s) => s.setTheme);

  useEffect(() => {
    const detected = detectInitialTheme();
    if (detected) setTheme(detected);
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

import { useEffect } from 'react';
import { useHelp } from '@/store/help';

/**
 * Central registry for app-wide keyboard shortcuts. Mounted once at the router
 * root. Today it binds the Quick Help overlay to ⌘K / Ctrl+K (and the
 * already-advertised ⌘?), preventing the browser default for those combos.
 *
 * Per-surface shortcuts (e.g. ⌘\ focus toggle) remain where they are scoped.
 */
export const useGlobalShortcuts = (): void => {
  const toggleHelp = useHelp((s) => s.toggle);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const key = e.key.toLowerCase();
      if (key === 'k' || key === '?' || key === '/') {
        e.preventDefault();
        toggleHelp();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [toggleHelp]);
};

import { useEffect } from 'react';
import { useHelp } from '@/store/help';

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

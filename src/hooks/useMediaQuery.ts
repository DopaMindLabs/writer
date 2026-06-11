import { useEffect, useState } from 'react';

/** Tracks a CSS media query, re-rendering when it starts or stops matching. */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };
    mql.addEventListener('change', onChange);
    return () => {
      mql.removeEventListener('change', onChange);
    };
  }, [query]);

  return matches;
};

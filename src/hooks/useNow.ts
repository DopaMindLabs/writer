import { useEffect, useState } from 'react';

/**
 * The current time, re-read on an interval so long-mounted components (e.g. a
 * countdown left open across a day boundary) re-render as time passes. When an
 * override is supplied (tests, stories) it is returned as-is and no timer runs.
 */
export const useNow = (override?: number, intervalMs = 60_000): number => {
  const [now, setNow] = useState(() => override ?? Date.now());
  useEffect(() => {
    if (override !== undefined) return undefined;
    const id = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => {
      clearInterval(id);
    };
  }, [override, intervalMs]);
  return override ?? now;
};

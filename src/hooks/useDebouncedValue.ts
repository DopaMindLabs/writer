import { useEffect, useState } from 'react';

// Returns `value` after it has been stable for `delayMs`. Used to keep
// keystroke-driven queries (e.g. citation search) from re-running a live
// IndexedDB query on every input event.
export const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
};

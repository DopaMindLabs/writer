import { useCallback, useEffect, useRef } from 'react';

const observeVisible =
  (onVisible: (page: number) => void): IntersectionObserverCallback =>
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const page = Number((entry.target as HTMLElement).dataset.page);
      if (page > 0) onVisible(page);
    }
  };

export interface ThumbVisibility {
  /** Ref for the scroll box that bounds "visible" — the observer's root. */
  rootRef: React.RefObject<HTMLDivElement | null>;
  /** Register (or, with `null`, unregister) a thumbnail element by page number. */
  register: (page: number, el: HTMLElement | null) => void;
}

/**
 * Reports thumbnail elements as they scroll into the rail's own scroll box, so
 * only visible pages are ever asked to render. Each element carries its page in
 * `data-page`; the observer reads it and calls `onVisible`.
 */
export const useThumbVisibility = (
  onVisible: (page: number) => void,
): ThumbVisibility => {
  const rootRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elsRef = useRef(new Map<number, HTMLElement>());

  useEffect(() => {
    const observer = new IntersectionObserver(observeVisible(onVisible), {
      root: rootRef.current,
    });
    observerRef.current = observer;
    elsRef.current.forEach((el) => { observer.observe(el); });
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [onVisible]);

  const register = useCallback((page: number, el: HTMLElement | null) => {
    const prev = elsRef.current.get(page);
    if (prev) observerRef.current?.unobserve(prev);
    if (el) {
      elsRef.current.set(page, el);
      observerRef.current?.observe(el);
    } else {
      elsRef.current.delete(page);
    }
  }, []);

  return { rootRef, register };
};

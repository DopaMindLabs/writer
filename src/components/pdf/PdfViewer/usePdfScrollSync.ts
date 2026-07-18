import { useCallback, useEffect, useRef, type RefObject } from 'react';

interface PdfScrollSyncInput {
  /** The scroll container whose `[data-page-number]` children are the pages. */
  scrollRef: RefObject<HTMLElement | null>;
  /** The parsed page count; the listener re-attaches when it changes. */
  numPages: number;
  /** The active page, driven by scroll and by external jumps. */
  page: number;
  /** Reports the page under the viewport as the scroll settles. */
  onPageChange?: (page: number) => void;
  /** Skip all wiring while the document is not yet ready (no pages mounted). */
  enabled: boolean;
}

interface PdfScrollSync {
  /** Scroll a page to the top of the viewport (used by thumbnails/pager/keys). */
  scrollToPage: (page: number) => void;
}

const pageElement = (
  root: HTMLElement | null,
  page: number,
): HTMLElement | null =>
  root?.querySelector<HTMLElement>(`[data-page-number="${String(page)}"]`) ?? null;

// Honour the reader's motion preference: smooth by default, instant when the
// user (or the test environment) asks for reduced motion — which also keeps a
// jump deterministic rather than animated.
const scrollBehaviour = (): ScrollBehavior =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';

/**
 * The page occupying the viewport's vertical midpoint — the one being read. The
 * topmost page whose top has scrolled above the midpoint wins, which agrees with
 * a jump (scrolling a page to the top puts it across the midpoint) so explicit
 * navigation is never overridden by the observation it triggers.
 */
const activePageFrom = (root: HTMLElement): number => {
  const midpoint = root.scrollTop + root.clientHeight / 2;
  let active = 1;
  for (const el of root.querySelectorAll<HTMLElement>('[data-page-number]')) {
    if (el.offsetTop <= midpoint) active = Number(el.dataset.pageNumber);
    else break;
  }
  return active;
};

/**
 * Two-way scroll ⇄ page sync for the continuous reader. A scroll listener reports
 * the page under the viewport midpoint as the active one (so the pager, crumb and
 * thumbnails follow the scroll), while `scrollToPage` drives the inverse — a
 * thumbnail click, pager tap or key jump scrolls that page into view. The
 * last-reported page is tracked so a scroll-driven change never re-triggers a
 * scroll, and the midpoint rule keeps the two directions in agreement.
 */
export const usePdfScrollSync = ({
  scrollRef,
  numPages,
  page,
  onPageChange,
  enabled,
}: PdfScrollSyncInput): PdfScrollSync => {
  const lastReportedRef = useRef(page);

  const scrollToPage = useCallback(
    (target: number) => {
      pageElement(scrollRef.current, target)?.scrollIntoView({
        block: 'start',
        behavior: scrollBehaviour(),
      });
    },
    [scrollRef],
  );

  useEffect(() => {
    const root = scrollRef.current;
    if (!enabled || !root || numPages === 0) return;
    let frame = 0;
    const report = () => {
      const active = activePageFrom(root);
      if (active !== lastReportedRef.current) {
        lastReportedRef.current = active;
        onPageChange?.(active);
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(report);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [enabled, numPages, scrollRef, onPageChange]);

  // An external jump (thumbnail, pager, key) sets `page` to something the scroll
  // has not settled on; scroll it into view. A scroll-driven change keeps `page`
  // and `lastReported` in step, so this never fights the user's own scrolling.
  useEffect(() => {
    if (page === lastReportedRef.current) return;
    lastReportedRef.current = page;
    scrollToPage(page);
  }, [page, scrollToPage]);

  return { scrollToPage };
};

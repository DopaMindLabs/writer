import { useEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { cn } from '@/lib/utils';

export interface SettingsSection {
  id: string;
  node: ReactNode;
}

interface SettingsSectionStackProps {
  sections: SettingsSection[];
  /** Id of the section to scroll into view (the selected nav item). */
  scrollTarget: string;
  /** Bumped on every nav click so re-selecting the same target re-scrolls. */
  scrollNonce: number;
  /** Reports the section nearest the top as the user scrolls (scroll-spy). */
  onVisibleChange?: (id: string) => void;
}

type RefMap = Map<string, HTMLElement>;

interface StackRefs {
  wrapper: RefObject<HTMLDivElement | null>;
  map: RefObject<RefMap>;
  suppress: RefObject<boolean>;
}

// How long to ignore scroll-spy after a programmatic scroll, so the smooth
// animation doesn't fight the active-section highlight.
const SCROLL_SUPPRESS_MS = 600;
// A section counts as "current" once its top passes this far below the
// scroll container's top edge.
const ACTIVATION_OFFSET_PX = 120;

const findScroller = (el: HTMLElement | null): Element | null =>
  el?.closest('main') ?? el?.parentElement ?? null;

const pickActive = (
  refMap: RefMap,
  ids: string[],
  scroller: Element | null,
): string | undefined => {
  const line = (scroller?.getBoundingClientRect().top ?? 0) + ACTIVATION_OFFSET_PX;
  let current: string | undefined = ids[0];
  for (const id of ids) {
    const el = refMap.get(id);
    if (el && el.getBoundingClientRect().top <= line) current = id;
  }
  return current;
};

const useScrollToTarget = (refs: StackRefs, target: string, nonce: number) => {
  useEffect(() => {
    const el = refs.map.current.get(target);
    if (!el || typeof el.scrollIntoView !== 'function') return;
    refs.suppress.current = true;
    const raf = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const timer = window.setTimeout(() => {
      refs.suppress.current = false;
    }, SCROLL_SUPPRESS_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [refs, target, nonce]);
};

const useScrollSpy = (
  refs: StackRefs,
  signature: string,
  onVisibleChange?: (id: string) => void,
) => {
  const callbackRef = useRef(onVisibleChange);
  callbackRef.current = onVisibleChange;
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const wrapper = refs.wrapper.current;
    if (!wrapper) return;
    const scroller = findScroller(wrapper);
    const ids = signature.split('|').filter(Boolean);
    const report = () => {
      if (refs.suppress.current) return;
      const id = pickActive(refs.map.current, ids, scroller);
      if (id) callbackRef.current?.(id);
    };
    const observer = new IntersectionObserver(report, {
      root: scroller instanceof Element ? scroller : null,
      threshold: [0, 0.25, 0.5, 1],
    });
    for (const id of ids) {
      const el = refs.map.current.get(id);
      if (el) observer.observe(el);
    }
    report();
    return () => { observer.disconnect(); };
  }, [refs, signature]);
};

export const SettingsSectionStack = ({
  sections,
  scrollTarget,
  scrollNonce,
  onVisibleChange,
}: SettingsSectionStackProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<RefMap>(new Map());
  const suppressRef = useRef(false);
  const refsRef = useRef<StackRefs>({
    wrapper: wrapperRef,
    map: mapRef,
    suppress: suppressRef,
  });
  const refs = refsRef.current;
  const signature = sections.map((s) => s.id).join('|');

  useScrollToTarget(refs, scrollTarget, scrollNonce);
  useScrollSpy(refs, signature, onVisibleChange);

  return (
    <div ref={wrapperRef} data-testid="settings-section-stack">
      {sections.map((section, index) => (
        <div
          key={section.id}
          id={`settings-section-${section.id}`}
          data-settings-section={section.id}
          ref={(el) => {
            if (el) mapRef.current.set(section.id, el);
            else mapRef.current.delete(section.id);
          }}
          className={cn(
            'scroll-mt-6 md:scroll-mt-9',
            index > 0 && 'mt-12 border-t border-rule/60 pt-12',
          )}
        >
          {section.node}
        </div>
      ))}
    </div>
  );
};

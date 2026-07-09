import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThumbVisibility } from './useThumbVisibility';

let ioCallback: IntersectionObserverCallback | null = null;
const observed: Element[] = [];
const unobserved: Element[] = [];

class MockIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: readonly number[] = [];
  constructor(cb: IntersectionObserverCallback) {
    ioCallback = cb;
  }
  observe(el: Element): void {
    observed.push(el);
  }
  unobserve(el: Element): void {
    unobserved.push(el);
  }
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

const elWithPage = (page: number): HTMLElement => {
  const el = document.createElement('div');
  el.dataset.page = String(page);
  return el;
};

const fire = (el: Element, isIntersecting: boolean): void => {
  act(() => {
    ioCallback?.(
      [{ isIntersecting, target: el } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
};

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  ioCallback = null;
  observed.length = 0;
  unobserved.length = 0;
});

describe('useThumbVisibility', () => {
  it('observes registered elements and reports the visible ones by page', () => {
    const onVisible = vi.fn();
    const { result } = renderHook(() => useThumbVisibility(onVisible));
    const el = elWithPage(2);
    act(() => { result.current.register(2, el); });
    expect(observed).toContain(el);
    fire(el, true);
    expect(onVisible).toHaveBeenCalledWith(2);
  });

  it('ignores elements that are not intersecting', () => {
    const onVisible = vi.fn();
    const { result } = renderHook(() => useThumbVisibility(onVisible));
    const el = elWithPage(3);
    act(() => { result.current.register(3, el); });
    fire(el, false);
    expect(onVisible).not.toHaveBeenCalled();
  });

  it('unobserves an element when it unregisters', () => {
    const { result } = renderHook(() => useThumbVisibility(vi.fn()));
    const el = elWithPage(4);
    act(() => { result.current.register(4, el); });
    act(() => { result.current.register(4, null); });
    expect(unobserved).toContain(el);
  });
});

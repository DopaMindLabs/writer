import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createRef } from 'react';
import { usePdfScrollSync } from './usePdfScrollSync';

const PAGE_HEIGHT = 100;
const VIEWPORT = 80;

/**
 * jsdom does no layout, so stamp the geometry the sync reads: each page sits at
 * `(n-1) * PAGE_HEIGHT`, the viewport is `VIEWPORT` tall, and `scrollTop` is
 * settable to simulate a scroll.
 */
const buildScrollContainer = (numPages: number): HTMLDivElement => {
  const root = document.createElement('div');
  Object.defineProperty(root, 'clientHeight', { value: VIEWPORT, configurable: true });
  let scrollTop = 0;
  Object.defineProperty(root, 'scrollTop', {
    get: () => scrollTop,
    set: (v: number) => { scrollTop = v; },
    configurable: true,
  });
  for (let n = 1; n <= numPages; n += 1) {
    const page = document.createElement('div');
    page.dataset.pageNumber = String(n);
    Object.defineProperty(page, 'offsetTop', { value: (n - 1) * PAGE_HEIGHT, configurable: true });
    root.appendChild(page);
  }
  document.body.appendChild(root);
  return root;
};

const pageEl = (root: HTMLElement, n: number): HTMLElement =>
  root.querySelector<HTMLElement>(`[data-page-number="${String(n)}"]`)!;

const scrollTo = async (root: HTMLElement, top: number): Promise<void> => {
  await act(async () => {
    root.scrollTop = top;
    root.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => { requestAnimationFrame(resolve); });
  });
};

describe('usePdfScrollSync', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reports the page under the viewport midpoint as the active page', async () => {
    const root = buildScrollContainer(3);
    const scrollRef = createRef<HTMLElement>();
    scrollRef.current = root;
    const onPageChange = vi.fn();

    renderHook(() =>
      usePdfScrollSync({ scrollRef, numPages: 3, page: 1, onPageChange, enabled: true }),
    );

    // Scroll so page 2's top (100) sits above the midpoint (150 + 40 = 190).
    await scrollTo(root, 150);
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it('does not report while it already sits on the active page', async () => {
    const root = buildScrollContainer(2);
    const scrollRef = createRef<HTMLElement>();
    scrollRef.current = root;
    const onPageChange = vi.fn();

    renderHook(() =>
      usePdfScrollSync({ scrollRef, numPages: 2, page: 1, onPageChange, enabled: true }),
    );

    await scrollTo(root, 0);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('scrolls a page into view when the active page jumps externally', () => {
    const root = buildScrollContainer(3);
    const scrollRef = createRef<HTMLElement>();
    scrollRef.current = root;
    const spy = vi.spyOn(pageEl(root, 3), 'scrollIntoView');

    const { rerender } = renderHook(
      ({ page }) =>
        usePdfScrollSync({ scrollRef, numPages: 3, page, onPageChange: vi.fn(), enabled: true }),
      { initialProps: { page: 1 } },
    );

    rerender({ page: 3 });
    expect(spy).toHaveBeenCalled();
  });

  it('exposes scrollToPage for imperative jumps', () => {
    const root = buildScrollContainer(2);
    const scrollRef = createRef<HTMLElement>();
    scrollRef.current = root;
    const spy = vi.spyOn(pageEl(root, 2), 'scrollIntoView');

    const { result } = renderHook(() =>
      usePdfScrollSync({ scrollRef, numPages: 2, page: 1, onPageChange: vi.fn(), enabled: true }),
    );

    result.current.scrollToPage(2);
    expect(spy).toHaveBeenCalled();
  });

  it('does no wiring while disabled', async () => {
    const root = buildScrollContainer(2);
    const scrollRef = createRef<HTMLElement>();
    scrollRef.current = root;
    const onPageChange = vi.fn();

    renderHook(() =>
      usePdfScrollSync({ scrollRef, numPages: 2, page: 1, onPageChange, enabled: false }),
    );

    await scrollTo(root, 200);
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

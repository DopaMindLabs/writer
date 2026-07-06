import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePdfTextSelection } from './usePdfTextSelection';

const buildPage = (): { container: HTMLElement; span: HTMLElement; pageEl: HTMLElement } => {
  const container = document.createElement('div');
  const pageEl = document.createElement('div');
  pageEl.setAttribute('data-page-number', '1');
  pageEl.getBoundingClientRect = () => new DOMRect(0, 0, 100, 200);
  const textLayer = document.createElement('div');
  textLayer.className = 'textLayer';
  const span = document.createElement('span');
  span.textContent = 'Lorem';
  textLayer.appendChild(span);
  pageEl.appendChild(textLayer);
  container.appendChild(pageEl);
  document.body.appendChild(container);
  return { container, span, pageEl };
};

// A fake selection over the span whose range reports a single client rect — the
// Selection API is the only source of geometry the hook consults.
const stubSelection = (span: HTMLElement): void => {
  const range = {
    startContainer: span,
    endContainer: span,
    getClientRects: () => [new DOMRect(10, 20, 30, 40)],
  } as unknown as Range;
  const selection = {
    isCollapsed: false,
    rangeCount: 1,
    getRangeAt: () => range,
    toString: () => 'Lorem',
  } as unknown as Selection;
  vi.spyOn(window, 'getSelection').mockReturnValue(selection);
};

let dom: ReturnType<typeof buildPage>;
beforeEach(() => {
  dom = buildPage();
});
afterEach(() => {
  vi.restoreAllMocks();
  dom.container.remove();
});

describe('usePdfTextSelection', () => {
  it('captures on pointerup', () => {
    stubSelection(dom.span);
    const onCapture = vi.fn();
    renderHook(() => usePdfTextSelection({ containerRef: { current: dom.container }, onCapture }));

    dom.container.dispatchEvent(new Event('pointerup'));

    expect(onCapture).toHaveBeenCalledWith({
      page: 1,
      quote: 'Lorem',
      rects: [{ x: 0.1, y: 0.1, w: 0.3, h: 0.2 }],
    });
  });

  it('captures on keyboard selection', () => {
    stubSelection(dom.span);
    const onCapture = vi.fn();
    renderHook(() => usePdfTextSelection({ containerRef: { current: dom.container }, onCapture }));

    dom.container.dispatchEvent(new Event('keyup'));

    expect(onCapture).toHaveBeenCalledOnce();
  });

  it('ignores an absent selection', () => {
    vi.spyOn(window, 'getSelection').mockReturnValue(null);
    const onCapture = vi.fn();
    renderHook(() => usePdfTextSelection({ containerRef: { current: dom.container }, onCapture }));
    dom.container.dispatchEvent(new Event('pointerup'));
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('ignores a selection that yields no rects', () => {
    const range = {
      startContainer: dom.span,
      endContainer: dom.span,
      getClientRects: () => [] as DOMRect[],
    } as unknown as Range;
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => range,
      toString: () => 'Lorem',
    } as unknown as Selection);
    const onCapture = vi.fn();
    renderHook(() => usePdfTextSelection({ containerRef: { current: dom.container }, onCapture }));
    dom.container.dispatchEvent(new Event('pointerup'));
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('ignores a selection that resolves to no page', () => {
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: true,
      rangeCount: 0,
    } as unknown as Selection);
    const onCapture = vi.fn();
    renderHook(() => usePdfTextSelection({ containerRef: { current: dom.container }, onCapture }));
    dom.container.dispatchEvent(new Event('pointerup'));
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('does nothing without a container', () => {
    stubSelection(dom.span);
    const onCapture = vi.fn();
    renderHook(() => usePdfTextSelection({ containerRef: { current: null }, onCapture }));
    dom.container.dispatchEvent(new Event('pointerup'));
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('removes listeners on unmount', () => {
    stubSelection(dom.span);
    const onCapture = vi.fn();
    const { unmount } = renderHook(() =>
      usePdfTextSelection({ containerRef: { current: dom.container }, onCapture }),
    );
    unmount();
    dom.container.dispatchEvent(new Event('pointerup'));
    expect(onCapture).not.toHaveBeenCalled();
  });
});

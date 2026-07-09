import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock only the adapter seam; getDocument is stubbed per test. The worker facade
// is real and harmlessly writes to the mock's GlobalWorkerOptions.
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('@/lib/pdf/pdfAdapter', () => ({
  pdfjs: { getDocument, GlobalWorkerOptions: { workerSrc: '' } },
}));

import { usePdfThumbnails } from './usePdfThumbnails';

const pdfBlob = (): Blob =>
  new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: 'application/pdf' });

// A single stable reference: the hook reloads whenever the blob identity changes
// (the real caller passes a stable `item.blob`), so a fresh blob per render would
// reset the queue forever.
const blob = pdfBlob();

interface FakeDoc {
  destroy: ReturnType<typeof vi.fn>;
  getPage: ReturnType<typeof vi.fn>;
  renderCalls: number[];
  resolveNext: () => void;
}

// A document whose page renders never resolve on their own, so a test can prove
// the queue only runs one at a time by releasing them by hand.
const makeDoc = (): FakeDoc => {
  const renderCalls: number[] = [];
  const pending: (() => void)[] = [];
  return {
    renderCalls,
    resolveNext: () => pending.shift()?.(),
    destroy: vi.fn().mockResolvedValue(undefined),
    getPage: vi.fn((page: number) =>
      Promise.resolve({
        getViewport: ({ scale }: { scale: number }) => ({
          width: 100 * scale,
          height: 140 * scale,
        }),
        render: () => {
          renderCalls.push(page);
          return { promise: new Promise<void>((resolve) => pending.push(resolve)) };
        },
      }),
    ),
  };
};

// Stub the canvas 2d path jsdom does not implement. `Object.defineProperty`'s
// `value` is untyped, so it sidesteps getContext's overloaded DOM signature
// without a cast.
const stubCanvas = (context: unknown): void => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => context),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    configurable: true,
    value: vi.fn(() => 'data:image/png;base64,AAA'),
  });
};

beforeEach(() => {
  getDocument.mockReset();
  stubCanvas({});
});

describe('usePdfThumbnails', () => {
  it('renders one page at a time in request order and caches each url', async () => {
    const doc = makeDoc();
    getDocument.mockReturnValue({ promise: Promise.resolve(doc) });

    const { result } = renderHook(() => usePdfThumbnails(blob, { width: 64 }));

    act(() => {
      result.current.requestPage(1);
      result.current.requestPage(2);
      result.current.requestPage(3);
    });

    // Only the head of the queue is in flight while the first render is pending.
    await waitFor(() => expect(doc.renderCalls).toEqual([1]));

    act(() => { doc.resolveNext(); });
    await waitFor(() => expect(result.current.thumbs[1]).toBe('data:image/png;base64,AAA'));
    await waitFor(() => expect(doc.renderCalls).toEqual([1, 2]));

    act(() => { doc.resolveNext(); });
    await waitFor(() => expect(doc.renderCalls).toEqual([1, 2, 3]));
    act(() => { doc.resolveNext(); });
    await waitFor(() => expect(Object.keys(result.current.thumbs)).toHaveLength(3));
  });

  it('renders a page once no matter how often it is requested', async () => {
    const doc = makeDoc();
    getDocument.mockReturnValue({ promise: Promise.resolve(doc) });

    const { result } = renderHook(() => usePdfThumbnails(blob, { width: 64 }));
    act(() => {
      result.current.requestPage(2);
      result.current.requestPage(2);
    });
    await waitFor(() => expect(doc.renderCalls).toEqual([2]));
    act(() => { doc.resolveNext(); });
    await waitFor(() => expect(result.current.thumbs[2]).toBeDefined());
    expect(doc.getPage).toHaveBeenCalledTimes(1);
  });

  it('never renders a page that was not requested', async () => {
    const doc = makeDoc();
    getDocument.mockReturnValue({ promise: Promise.resolve(doc) });
    renderHook(() => usePdfThumbnails(blob, { width: 64 }));
    // Give the load a chance to settle; nothing was requested, so nothing renders.
    await waitFor(() => expect(doc.getPage).not.toHaveBeenCalled());
  });

  it('skips a page when the canvas has no 2d context', async () => {
    const doc = makeDoc();
    getDocument.mockReturnValue({ promise: Promise.resolve(doc) });
    stubCanvas(null);

    const { result } = renderHook(() => usePdfThumbnails(blob, { width: 64 }));
    act(() => { result.current.requestPage(1); });
    await waitFor(() => expect(doc.getPage).toHaveBeenCalledWith(1));
    // No context → no url cached, and the queue moves on without stalling.
    await waitFor(() => expect(result.current.thumbs[1]).toBeUndefined());
  });

  it('destroys the document on unmount', async () => {
    const doc = makeDoc();
    getDocument.mockReturnValue({ promise: Promise.resolve(doc) });
    const { result, unmount } = renderHook(() => usePdfThumbnails(blob, { width: 64 }));
    act(() => { result.current.requestPage(1); });
    await waitFor(() => expect(doc.getPage).toHaveBeenCalled());
    unmount();
    expect(doc.destroy).toHaveBeenCalledTimes(1);
  });

  it('destroys a document that resolves after unmount', async () => {
    const doc = makeDoc();
    let release: (d: FakeDoc) => void = () => undefined;
    getDocument.mockReturnValue({
      promise: new Promise<FakeDoc>((resolve) => { release = resolve; }),
    });
    const { unmount } = renderHook(() => usePdfThumbnails(blob, { width: 64 }));
    unmount();
    await act(async () => {
      release(doc);
      await Promise.resolve();
    });
    expect(doc.destroy).toHaveBeenCalledTimes(1);
  });
});

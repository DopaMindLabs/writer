import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock only the adapter seam: the hook uses the pure clonePdfBytes helper, whose
// module transitively imports pdf.js (which needs a real browser). The copy
// discipline under test never touches the engine.
vi.mock('@/lib/pdf/pdfAdapter', () => ({
  pdfjs: { getDocument: vi.fn(), GlobalWorkerOptions: { workerSrc: '' } },
}));

import { usePdfDocument } from './usePdfDocument';

const BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 9, 8, 7, 6]);

const pdfBlob = (): Blob => new Blob([BYTES], { type: 'application/pdf' });

const readyData = (state: ReturnType<typeof usePdfDocument>['state']): Uint8Array => {
  if (state.status !== 'ready') throw new Error(`expected ready, got ${state.status}`);
  return state.file.data;
};

describe('usePdfDocument', () => {
  // The blob must be a stable reference across renders — the hook re-reads
  // whenever the blob identity changes, and the real caller passes a stable
  // `item.blob`. A fresh blob per render would re-trigger the load forever.
  it('exposes loading then ready with byte data', async () => {
    const blob = pdfBlob();
    const { result } = renderHook(() => usePdfDocument(blob));
    expect(result.current.state.status).toBe('loading');
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(Array.from(readyData(result.current.state))).toEqual(Array.from(BYTES));
  });

  it('hands out an independent copy of the bytes', async () => {
    const blob = pdfBlob();
    const { result } = renderHook(() => usePdfDocument(blob));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    // Simulate the engine mutating (or detaching) the buffer it was handed:
    // scribble over the handed-out copy, then reload and prove the fresh copy is
    // intact — the master buffer is never handed out, so it survives.
    readyData(result.current.state).fill(0);

    act(() => {
      result.current.reload();
    });
    await waitFor(() =>
      expect(Array.from(readyData(result.current.state))).toEqual(Array.from(BYTES)),
    );
  });

  it('keeps file identity stable across re-renders', async () => {
    const blob = pdfBlob();
    const { result, rerender } = renderHook(() => usePdfDocument(blob));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    const before = result.current.state;
    rerender();
    expect(result.current.state.status).toBe('ready');
    if (before.status !== 'ready' || result.current.state.status !== 'ready') {
      throw new Error('expected ready');
    }
    expect(result.current.state.file).toBe(before.file);
  });

  it('reload issues a fresh copy', async () => {
    const blob = pdfBlob();
    const { result } = renderHook(() => usePdfDocument(blob));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    const before = result.current.state;
    act(() => {
      result.current.reload();
    });
    await waitFor(() => {
      if (result.current.state.status !== 'ready' || before.status !== 'ready') {
        throw new Error('expected ready');
      }
      expect(result.current.state.file).not.toBe(before.file);
    });
    expect(Array.from(readyData(result.current.state))).toEqual(Array.from(BYTES));
  });

  it('ignores a resolve after unmount', async () => {
    const blob = pdfBlob();
    const { result, unmount } = renderHook(() => usePdfDocument(blob));
    expect(result.current.state.status).toBe('loading');
    unmount();
    // Let the arrayBuffer() promise settle after the component is gone; the
    // cancelled guard must swallow the resolve without a state-update warning.
    await Promise.resolve();
    await Promise.resolve();
  });

  it('stays loading for a null blob', () => {
    const { result } = renderHook(() => usePdfDocument(null));
    expect(result.current.state.status).toBe('loading');
  });

  it('surfaces an error when the bytes cannot be read', async () => {
    const failing = {
      arrayBuffer: () => Promise.reject(new Error('unreadable')),
    } as unknown as Blob;
    const { result } = renderHook(() => usePdfDocument(failing));
    await waitFor(() => expect(result.current.state.status).toBe('error'));
  });

  it('ignores a reload before the bytes are ready', async () => {
    const blob = pdfBlob();
    const { result } = renderHook(() => usePdfDocument(blob));
    expect(result.current.state.status).toBe('loading');
    act(() => {
      result.current.reload(); // master not yet read — a no-op, stays loading
    });
    expect(result.current.state.status).toBe('loading');
    // Let the pending read settle so its state update is wrapped in act().
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
  });
});

import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePdfViewport, MIN_SCALE, MAX_SCALE } from './usePdfViewport';

describe('usePdfViewport', () => {
  it('starts on the first page at unit scale', () => {
    const { result } = renderHook(() => usePdfViewport());
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.numPages).toBe(0);
    expect(result.current.scale).toBe(1);
  });

  it('sets the page count and clamps the current page into range', () => {
    const { result } = renderHook(() => usePdfViewport());
    act(() => result.current.setNumPages(3));
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.pageNumber).toBe(3);
    // A shorter document clamps the current page back into range.
    act(() => result.current.setNumPages(2));
    expect(result.current.pageNumber).toBe(2);
  });

  it('keeps navigation within bounds', () => {
    const { result } = renderHook(() => usePdfViewport());
    act(() => result.current.setNumPages(2));
    act(() => result.current.prev());
    expect(result.current.pageNumber).toBe(1); // cannot go below 1
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.pageNumber).toBe(2); // cannot exceed numPages
  });

  it('clamps zoom to the allowed range', () => {
    const { result } = renderHook(() => usePdfViewport());
    for (let i = 0; i < 10; i += 1) act(() => result.current.zoomOut());
    expect(result.current.scale).toBe(MIN_SCALE);
    for (let i = 0; i < 20; i += 1) act(() => result.current.zoomIn());
    expect(result.current.scale).toBe(MAX_SCALE);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNow } from './useNow';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the override untouched and runs no timer', () => {
    const { result } = renderHook(() => useNow(1_000));
    expect(result.current).toBe(1_000);
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(result.current).toBe(1_000);
  });

  it('ticks the real clock on the interval so consumers re-render', () => {
    vi.setSystemTime(50_000);
    const { result } = renderHook(() => useNow(undefined, 60_000));
    expect(result.current).toBe(50_000);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe(110_000);
  });

  it('clears the interval on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useNow());
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

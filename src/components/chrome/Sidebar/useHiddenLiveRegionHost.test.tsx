import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHiddenLiveRegionHost } from './useHiddenLiveRegionHost';

describe('useHiddenLiveRegionHost', () => {
  it('mounts an aria-hidden host in the body and removes it on unmount', () => {
    const { result, unmount } = renderHook(() => useHiddenLiveRegionHost());
    const host = result.current;
    expect(host).toBeInstanceOf(HTMLElement);
    expect(host?.getAttribute('aria-hidden')).toBe('true');
    expect(host?.parentElement).toBe(document.body);

    unmount();
    expect(host?.parentElement).toBeNull();
  });

  it('keeps the same host across re-renders', () => {
    const { result, rerender } = renderHook(() => useHiddenLiveRegionHost());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

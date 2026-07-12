import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { keyMismatchState } from '@/lib/cloud/crypto/keyMismatch';
import { useKeyMismatch } from './useKeyMismatch';

afterEach(() => {
  keyMismatchState.set(false);
});

describe('useKeyMismatch', () => {
  it('reflects the current mismatch state and re-renders on change', () => {
    const { result } = renderHook(() => useKeyMismatch());
    expect(result.current).toBe(false);

    act(() => {
      keyMismatchState.set(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      keyMismatchState.set(false);
    });
    expect(result.current).toBe(false);
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { keyMismatchState } from '@/lib/cloud/crypto/keyMismatch';
import { keylessLockState } from '@/lib/cloud/crypto/keylessLock';
import { useCloudLockReason } from './useCloudLockReason';

afterEach(() => {
  keyMismatchState.set(false);
  keylessLockState.set(false);
});

describe('useCloudLockReason', () => {
  it('reflects the lock reason and re-renders as either signal changes', () => {
    const { result } = renderHook(() => useCloudLockReason());
    expect(result.current).toBe('none');

    act(() => { keylessLockState.set(true); });
    expect(result.current).toBe('keyless');

    act(() => { keyMismatchState.set(true); });
    expect(result.current).toBe('mismatch');

    act(() => { keyMismatchState.set(false); });
    expect(result.current).toBe('keyless');

    act(() => { keylessLockState.set(false); });
    expect(result.current).toBe('none');
  });
});

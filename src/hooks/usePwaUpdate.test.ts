import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePwaUpdate } from './usePwaUpdate';
import { pwaUpdateState } from '@/lib/pwa/updateState';

afterEach(() => {
  pwaUpdateState.set(false);
  pwaUpdateState.setApplyCallback(null);
});

describe('usePwaUpdate', () => {
  it('reports no pending update by default', () => {
    const { result } = renderHook(() => usePwaUpdate());
    expect(result.current.updateReady).toBe(false);
  });

  it('tracks the update signal reactively', () => {
    const { result } = renderHook(() => usePwaUpdate());
    act(() => {
      pwaUpdateState.set(true);
    });
    expect(result.current.updateReady).toBe(true);
  });

  it('delegates applyUpdate to the stored callback', () => {
    const apply = vi.fn();
    pwaUpdateState.setApplyCallback(apply);
    const { result } = renderHook(() => usePwaUpdate());
    result.current.applyUpdate();
    expect(apply).toHaveBeenCalledTimes(1);
  });
});

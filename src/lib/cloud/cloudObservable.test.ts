import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCloudObservable, type CloudObservable } from './cloudObservable';

/** A minimal BehaviorSubject-like fake to inject into the hook. */
const makeSubject = <T,>(initial: T) => {
  let current = initial;
  const listeners = new Set<(v: T) => void>();
  const observable: CloudObservable<T> = {
    subscribe: (next) => {
      listeners.add(next);
      next(current);
      return { unsubscribe: () => listeners.delete(next) };
    },
  };
  const emit = (v: T) => {
    current = v;
    listeners.forEach((l) => l(v));
  };
  return { observable, emit, listenerCount: () => listeners.size };
};

describe('useCloudObservable', () => {
  it('surfaces the current value on subscribe and re-renders on emit', () => {
    const { observable, emit } = makeSubject('a');
    const { result } = renderHook(() => useCloudObservable(observable, 'initial'));
    expect(result.current).toBe('a');
    act(() => {
      emit('b');
    });
    expect(result.current).toBe('b');
  });

  it('unsubscribes on unmount', () => {
    const { observable, listenerCount } = makeSubject(1);
    const { unmount } = renderHook(() => useCloudObservable(observable, 0));
    expect(listenerCount()).toBe(1);
    unmount();
    expect(listenerCount()).toBe(0);
  });
});

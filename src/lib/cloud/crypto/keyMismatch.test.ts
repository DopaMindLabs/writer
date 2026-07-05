import { describe, it, expect, afterEach, vi } from 'vitest';
import { keyMismatchState } from './keyMismatch';

afterEach(() => {
  keyMismatchState.set(false);
});

describe('keyMismatchState', () => {
  it('defaults to no mismatch', () => {
    expect(keyMismatchState.current()).toBe(false);
  });

  it('reflects the set value synchronously', () => {
    keyMismatchState.set(true);
    expect(keyMismatchState.current()).toBe(true);
    keyMismatchState.set(false);
    expect(keyMismatchState.current()).toBe(false);
  });

  it('notifies subscribers only on a real change', () => {
    const listener = vi.fn();
    const unsubscribe = keyMismatchState.subscribe(listener);

    keyMismatchState.set(true);
    keyMismatchState.set(true); // no change → no extra notification
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    keyMismatchState.set(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

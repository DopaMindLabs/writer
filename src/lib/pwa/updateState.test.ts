import { describe, it, expect, afterEach, vi } from 'vitest';
import { pwaUpdateState } from './updateState';

afterEach(() => {
  pwaUpdateState.set(false);
  pwaUpdateState.setApplyCallback(null);
});

describe('pwaUpdateState', () => {
  it('defaults to no pending update', () => {
    expect(pwaUpdateState.current()).toBe(false);
  });

  it('reflects the set value synchronously', () => {
    pwaUpdateState.set(true);
    expect(pwaUpdateState.current()).toBe(true);
    pwaUpdateState.set(false);
    expect(pwaUpdateState.current()).toBe(false);
  });

  it('notifies subscribers only on a real change', () => {
    const listener = vi.fn();
    const unsubscribe = pwaUpdateState.subscribe(listener);

    pwaUpdateState.set(true);
    pwaUpdateState.set(true); // no change → no extra notification
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    pwaUpdateState.set(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('applies the stored update callback', () => {
    const apply = vi.fn();
    pwaUpdateState.setApplyCallback(apply);
    pwaUpdateState.applyUpdate();
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('is a safe no-op when no update callback is stored', () => {
    expect(() => {
      pwaUpdateState.applyUpdate();
    }).not.toThrow();
  });
});

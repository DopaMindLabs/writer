import { describe, it, expect, vi, afterEach } from 'vitest';
import { keyMismatchState } from './keyMismatch';
import { keylessLockState } from './keylessLock';
import { currentLockReason, subscribeLockReason } from './lockReason';

afterEach(() => {
  keyMismatchState.set(false);
  keylessLockState.set(false);
});

describe('currentLockReason', () => {
  it('is none when neither signal is set', () => {
    expect(currentLockReason()).toBe('none');
  });

  it('reports keyless when only the keyless signal is set', () => {
    keylessLockState.set(true);
    expect(currentLockReason()).toBe('keyless');
  });

  it('reports mismatch, which wins over keyless when both are set', () => {
    keylessLockState.set(true);
    keyMismatchState.set(true);
    expect(currentLockReason()).toBe('mismatch');
  });
});

describe('subscribeLockReason', () => {
  it('notifies on either signal and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLockReason(listener);

    keyMismatchState.set(true);
    keylessLockState.set(true);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    keyMismatchState.set(false);
    keylessLockState.set(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import { keylessLockState } from './keylessLock';

afterEach(() => {
  keylessLockState.set(false);
});

describe('keylessLockState', () => {
  it('defaults to off and reads the current value', () => {
    expect(keylessLockState.current()).toBe(false);
    keylessLockState.set(true);
    expect(keylessLockState.current()).toBe(true);
  });

  it('notifies subscribers only on a real change', () => {
    let calls = 0;
    const stop = keylessLockState.subscribe(() => {
      calls += 1;
    });
    keylessLockState.set(true);
    keylessLockState.set(true); // no-op, same value
    keylessLockState.set(false);
    expect(calls).toBe(2);
    stop();
    keylessLockState.set(true);
    expect(calls).toBe(2); // unsubscribed
  });
});

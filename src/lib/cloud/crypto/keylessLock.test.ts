import { describe, it, expect, afterEach, vi } from 'vitest';
import { keylessLockState } from './keylessLock';

afterEach(() => {
  keylessLockState.releaseBarrier();
  keylessLockState.set(false);
  localStorage.clear();
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

  it('holds a synchronous write barrier independently of the monitor flag', () => {
    expect(keylessLockState.beginBarrier()).toBe(true);
    expect(keylessLockState.current()).toBe(true);

    keylessLockState.set(false);
    expect(keylessLockState.current()).toBe(true);

    keylessLockState.releaseBarrier();
    expect(keylessLockState.current()).toBe(false);
  });

  it('lets the provisioning tab write while keeping the shared barrier active', () => {
    expect(keylessLockState.beginBarrier(true)).toBe(true);
    expect(keylessLockState.current()).toBe(false);
  });

  it("releasing this tab cannot erase another tab's active barrier", () => {
    expect(keylessLockState.beginBarrier()).toBe(true);
    const ownKey = Object.keys(localStorage).find((key) =>
      key.startsWith('lipsum-cloud-write-barrier:'),
    );
    expect(ownKey).toBeDefined();
    const ownLease = JSON.parse(localStorage.getItem(ownKey ?? '') ?? '{}') as object;
    localStorage.setItem(
      'lipsum-cloud-write-barrier:peer',
      JSON.stringify({ ...ownLease, source: 'peer' }),
    );

    keylessLockState.releaseBarrier();

    expect(keylessLockState.current()).toBe(true);
  });

  it('makes an active write barrier visible to another tab module instance', async () => {
    expect(keylessLockState.beginBarrier()).toBe(true);
    vi.resetModules();

    const sibling = await import('./keylessLock');

    expect(sibling.keylessLockState.current()).toBe(true);
    expect(sibling.keylessLockState.beginBarrier()).toBe(false);
    keylessLockState.releaseBarrier();
    expect(sibling.keylessLockState.current()).toBe(false);
  });
});

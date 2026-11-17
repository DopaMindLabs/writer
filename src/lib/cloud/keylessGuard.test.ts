import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import type { UserLogin } from 'dexie-cloud-addon';
import { keylessLockState } from './crypto/keylessLock';
import {
  deviceKeyProvider,
  saveDeviceKeyRing,
  forgetDeviceKeyRing,
} from './crypto/keyStore';
import { deriveKeyRing, generateRootSecret } from './crypto/keys';
import type { CloudObservable } from './cloudObservable';
import { startKeylessLockMonitor } from './keylessGuard';

type User = { userId: string; isLoggedIn: boolean } | undefined;

const userStub = () => {
  let listener: ((u: User) => void) | null = null;
  return {
    observable: {
      subscribe: (next: (u: User) => void) => {
        listener = next;
        return { unsubscribe: () => (listener = null) };
      },
    } as unknown as CloudObservable<UserLogin | undefined>,
    emit: (u: User) => listener?.(u),
    hasListener: () => listener !== null,
  };
};

beforeEach(async () => {
  keylessLockState.set(false);
  await forgetDeviceKeyRing();
});

afterEach(async () => {
  keylessLockState.set(false);
  await forgetDeviceKeyRing();
});

describe('startKeylessLockMonitor', () => {
  it('locks when signed in without a key, and clears once a ring is acquired', async () => {
    const user = userStub();
    const stop = startKeylessLockMonitor(user.observable);

    user.emit({ userId: 'u1', isLoggedIn: true }); // signed in, no ring yet
    expect(keylessLockState.current()).toBe(true);

    await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(generateRootSecret(), 1) });
    expect(deviceKeyProvider.current()).not.toBeNull();
    expect(keylessLockState.current()).toBe(false); // ring acquired → unlocked

    stop();
  });

  it('never locks while signed out, even without a key', () => {
    const user = userStub();
    const stop = startKeylessLockMonitor(user.observable);

    user.emit(undefined); // signed out
    expect(keylessLockState.current()).toBe(false);

    stop();
  });

  it('re-locks if the ring is forgotten while still signed in', async () => {
    const user = userStub();
    await saveDeviceKeyRing({ accountId: null, ring: await deriveKeyRing(generateRootSecret(), 1) });
    const stop = startKeylessLockMonitor(user.observable);

    user.emit({ userId: 'u1', isLoggedIn: true }); // signed in with a ring
    expect(keylessLockState.current()).toBe(false);

    await forgetDeviceKeyRing(); // e.g. forget-this-device
    expect(keylessLockState.current()).toBe(true);

    stop();
  });

  it('stops reacting after unsubscribe', () => {
    const user = userStub();
    const stop = startKeylessLockMonitor(user.observable);
    stop();
    expect(user.hasListener()).toBe(false);
    user.emit({ userId: 'u1', isLoggedIn: true });
    expect(keylessLockState.current()).toBe(false);
  });
});

import type { UserLogin } from 'dexie-cloud-addon';
import { keylessLockState } from './crypto/keylessLock';
import { deviceKeyProvider, onDeviceKeyRingChange } from './crypto/keyStore';
import { cloudCurrentUser } from './cloudClient';
import type { CloudObservable } from './cloudObservable';

/**
 * Keep {@link keylessLockState} in sync with "signed in, but no key ring". It
 * recomputes whenever the sign-in identity changes or the device key ring is
 * acquired/forgotten, so the write middleware refuses content writes exactly
 * while a signed-in device has no key to seal with. Returns an unsubscribe. A
 * no-op on a plain (non-cloud) database whose user observable stays signed-out.
 */
export const startKeylessLockMonitor = (
  users: CloudObservable<UserLogin | undefined> = cloudCurrentUser(),
  onRingChange: (listener: () => void) => () => void = onDeviceKeyRingChange,
): (() => void) => {
  let loggedIn = false;
  const recompute = (): void => {
    keylessLockState.set(loggedIn && deviceKeyProvider.current() === null);
  };
  const userSub = users.subscribe((user) => {
    loggedIn = user?.isLoggedIn ?? false;
    recompute();
  });
  const stopRing = onRingChange(recompute);
  return () => {
    userSub.unsubscribe();
    stopRing();
  };
};

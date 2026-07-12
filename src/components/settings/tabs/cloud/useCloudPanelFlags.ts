import type { UserLogin } from 'dexie-cloud-addon';
import type { EscrowPresence } from '@/lib/cloud/cloudClient';
import { useDeviceLimitBlocked } from './useDeviceSlots';

export interface CloudPanelFlags {
  signedIn: boolean;
  keylessSignedIn: boolean;
  /** Sync and reconcile status are shown to any signed-in device — a keyless
   *  one is still syncing ciphertext and its reconcile can still fail, so it
   *  must not be left without diagnostics while it waits to unlock. */
  showStatus: boolean;
  /** The two-device beta limit: a blocked third device gets the hard-block
   *  banner in place of the keyless section, so no key action is offered. */
  deviceLimitBlocked: boolean;
}

/** Derive the panel's render flags from the live cloud state — keeps
 *  {@link CloudSectionPanel} a thin render. */
export const useCloudPanelFlags = (
  user: UserLogin | undefined,
  hasKey: boolean,
  presence: EscrowPresence,
): CloudPanelFlags => {
  const signedIn = user?.isLoggedIn ?? false;
  const keylessSignedIn = signedIn && !hasKey;
  const deviceLimitBlocked = useDeviceLimitBlocked(keylessSignedIn, presence);
  return {
    signedIn,
    keylessSignedIn,
    showStatus: signedIn || hasKey,
    deviceLimitBlocked,
  };
};

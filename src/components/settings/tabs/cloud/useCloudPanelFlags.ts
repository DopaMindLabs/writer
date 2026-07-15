import { useSyncExternalStore } from 'react';
import type { UserLogin } from 'dexie-cloud-addon';
import type { EscrowPresence } from '@/lib/cloud/cloudClient';
import { deviceRevokedState } from '@/lib/cloud/deviceRevoked';
import { devicePreviewState } from '@/lib/cloud/devicePreview';
import { useDeviceLimitBlocked } from './useDeviceSlots';

export interface CloudPanelFlags {
  signedIn: boolean;
  keylessSignedIn: boolean;
  /** Sync and reconcile status are shown to any signed-in device — a keyless
   *  one is still syncing ciphertext and its reconcile can still fail, so it
   *  must not be left without diagnostics while it waits to unlock. */
  showStatus: boolean;
  /** The beta device limit: a device past the cap gets the hard-block banner in
   *  place of the keyless section, so no key action is offered. */
  deviceLimitBlocked: boolean;
  /** This device's own slot was revoked from another device. */
  deviceRevoked: boolean;
  /** The device list is shown to any signed-in device — including a blocked one,
   *  which is exactly the device that needs to free a slot, and can only do so
   *  from here. Registry rows are readable while keyless by design, and removing
   *  a slot is not a key action, so nothing about the hard block is weakened. */
  showDeviceList: boolean;
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
  const deviceRevoked = useSyncExternalStore(
    deviceRevokedState.subscribe,
    deviceRevokedState.current,
    deviceRevokedState.current,
  );
  const devicePreview = useSyncExternalStore(
    devicePreviewState.subscribe,
    devicePreviewState.current,
    devicePreviewState.current,
  );
  return {
    signedIn,
    keylessSignedIn,
    showStatus: signedIn || hasKey,
    deviceLimitBlocked,
    deviceRevoked,
    showDeviceList: signedIn || devicePreview !== null,
  };
};

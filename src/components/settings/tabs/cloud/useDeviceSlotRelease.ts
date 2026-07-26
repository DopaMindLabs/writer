import { useCallback, useState } from 'react';
import { freeCloudDeviceSlot } from '@/lib/cloud/cloudClient';

export interface DeviceSlotRelease {
  /** The device awaiting confirmation, or `null` when the dialog is closed. */
  pending: string | null;
  ask: (id: string) => void;
  cancel: () => void;
  confirm: () => void;
}

/**
 * Confirmation state for freeing another browser's beta slot. This is not remote
 * sign-out: that browser keeps its session and may continue syncing. The explicit
 * confirmation prevents a stray click from unexpectedly changing slot capacity.
 */
export const useDeviceSlotRelease = (): DeviceSlotRelease => {
  const [pending, setPending] = useState<string | null>(null);

  const cancel = useCallback(() => {
    setPending(null);
  }, []);

  const confirm = useCallback(() => {
    if (pending === null) return;
    void freeCloudDeviceSlot(pending);
    setPending(null);
  }, [pending]);

  return { pending, ask: setPending, cancel, confirm };
};

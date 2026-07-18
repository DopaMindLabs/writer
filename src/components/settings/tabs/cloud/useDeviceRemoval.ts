import { useCallback, useState } from 'react';
import { removeCloudDevice } from '@/lib/cloud/cloudClient';

export interface DeviceRemoval {
  /** The device awaiting confirmation, or `null` when the dialog is closed. */
  pending: string | null;
  ask: (id: string) => void;
  cancel: () => void;
  confirm: () => void;
}

/**
 * Confirmation state for revoking a device. Removing a slot is not destructive —
 * nothing is deleted and the device keeps its writing — but it does reach across
 * to another machine, so it is worth a deliberate second step rather than a stray
 * click on a list row.
 */
export const useDeviceRemoval = (): DeviceRemoval => {
  const [pending, setPending] = useState<string | null>(null);

  const cancel = useCallback(() => {
    setPending(null);
  }, []);

  const confirm = useCallback(() => {
    if (pending === null) return;
    void removeCloudDevice(pending);
    setPending(null);
  }, [pending]);

  return { pending, ask: setPending, cancel, confirm };
};

import { useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import {
  isAccountPullComplete,
  cloudClientIdentity,
  type EscrowPresence,
} from '@/lib/cloud/cloudClient';
import { DEVICE_LIMIT } from '@/lib/cloud/deviceRegistry';
import { deviceLimitState } from '@/lib/cloud/deviceLimit';

/** What the registry read needs to decide the blocked state. */
interface DeviceSlots {
  ids: string[];
  ownId: string | null;
}

/**
 * Whether this device is turned away by the two-device beta limit: signed in,
 * keyless, the pull confirmed, the registry full, and this device not among the
 * registered ids. Registry ids and counts are readable while keyless by design
 * (the table is unencrypted), so a third device can be told before it can act.
 * `presence` is a dependency so the registry re-reads the moment the initial
 * pull resolves. The dev/e2e `?cloud-devices=full` affordance forces `true`.
 */
export const useDeviceLimitBlocked = (
  keylessSignedIn: boolean,
  presence: EscrowPresence,
): boolean => {
  const forced = useSyncExternalStore(
    deviceLimitState.subscribe,
    deviceLimitState.current,
    deviceLimitState.current,
  );
  const slots = useLiveQuery<DeviceSlots | undefined>(
    async () => {
      if (!keylessSignedIn || !isAccountPullComplete()) return undefined;
      const ids = await db.cloudDevices.toCollection().primaryKeys();
      return { ids, ownId: cloudClientIdentity() };
    },
    [keylessSignedIn, presence],
  );
  if (forced) return true;
  if (!slots) return false;
  if (slots.ownId !== null && slots.ids.includes(slots.ownId)) return false;
  return slots.ids.length >= DEVICE_LIMIT;
};
